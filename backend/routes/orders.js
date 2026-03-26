const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Admin = require('../models/Admin');
const notificationService = require('../services/notificationService');
const upiService = require('../services/upiService');

// Helper to generate a unique 4-digit order number
const generateOrderNumber = () => Math.floor(1000 + Math.random() * 9000).toString();

// Get UPI payment details for an order
router.get('/upi-details/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId).populate({
      path: 'store',
      populate: { path: 'admin', select: 'name merchantUpiId upiId businessName bankName upiType' }
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const vendor = order.store.admin;
    const amount = upiService.formatAmount(order.totalAmount);
    
    // Use merchant UPI ID if available, otherwise fallback to personal UPI
    const upiId = vendor.merchantUpiId || vendor.upiId;
    const merchantName = vendor.businessName || vendor.name || 'UniVerse Food';
    
    if (!upiId) {
      return res.status(400).json({ message: 'UPI ID not configured for this vendor' });
    }

    // Generate UPI payment link
    const upiLink = upiService.generateUpiLink(
      upiId, 
      amount, 
      order._id, 
      merchantName,
      `Payment for Order #${order.orderNumber}`
    );

    // Generate QR code data
    const qrData = upiService.generateUpiQrData(
      upiId, 
      amount, 
      order._id, 
      merchantName,
      `Payment for Order #${order.orderNumber}`
    );

    // Validate UPI ID and get info
    const upiValidation = upiService.validateUpiId(upiId);
    
    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      upiId: upiId,
      merchantName: merchantName,
      upiLink: upiLink,
      qrData: qrData,
      upiValidation: upiValidation,
      vendorInfo: {
        name: vendor.name,
        businessName: vendor.businessName,
        bankName: vendor.bankName,
        upiType: vendor.upiType
      },
      warnings: upiValidation.warning ? [upiValidation.warning] : []
    });
  } catch (error) {
    console.error('Error getting UPI details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get UPI setup recommendations
router.get('/upi-recommendations', (req, res) => {
  try {
    const recommendations = upiService.getRecommendedProviders();
    res.json({
      recommendations,
      currentIssues: [
        'Personal UPI IDs face transaction limits',
        'Risk warnings in UPI apps',
        'Payment mode restrictions',
        'Daily transaction caps'
      ],
      benefits: {
        merchantUpi: [
          'No risk warnings',
          'Higher transaction limits',
          'Business branding',
          'Instant settlements',
          'Professional appearance'
        ]
      }
    });
  } catch (error) {
    console.error('Error getting UPI recommendations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new Order (Public Customer endpoint)
router.post('/create', async (req, res) => {
  try {
    const { storeId, items, totalAmount, paymentMethod, customerPhone, orderType, packagingChargeApplied } = req.body;

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const newOrder = new Order({
      store: storeId,
      orderNumber: generateOrderNumber(),
      items,
      totalAmount,
      paymentMethod,
      customerPhone,
      orderType,
      packagingChargeApplied,
      status: paymentMethod === 'Cash' ? 'Pending' : 'Payment Pending',
      paymentStatus: paymentMethod === 'Cash' ? 'Pending' : 'Pending'
    });

    const savedOrder = await newOrder.save();

    // Only emit socket event to vendor for cash orders immediately
    // UPI orders will be notified after payment confirmation
    if (paymentMethod === 'Cash') {
      const io = req.app.get('io');
      io.to(storeId).emit('new_order', savedOrder);
    }

    // FIREBASE FCM PUSH NOTIFICATION FOR VENDOR (New robust solution)
    try {
      if (store.fcmTokens && store.fcmTokens.length > 0) {
        const notificationData = {
          title: '🍔 New Order Received!',
          body: `Order #${savedOrder.orderNumber} - ₹${savedOrder.totalAmount}`,
          orderId: savedOrder._id,
          type: 'new_order',
          clickAction: `/vendor/orders/${savedOrder._id}`
        };

        // Send to all vendor's FCM tokens
        const results = await notificationService.sendToMultipleDevices(store.fcmTokens, notificationData);
        
        // Remove invalid tokens from database
        const invalidTokens = results
          .filter(result => result.result && result.result.error === 'token_invalid')
          .map(result => result.token);
        
        if (invalidTokens.length > 0) {
          store.fcmTokens = store.fcmTokens.filter(token => !invalidTokens.includes(token));
          await store.save();
          console.log(`Removed ${invalidTokens.length} invalid FCM tokens`);
        }
        
        console.log(`FCM notification sent to ${store.fcmTokens.length} devices`);
      }
    } catch (fcmErr) {
      console.error('Vendor FCM Push Error:', fcmErr.message);
    }

    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Vendor's Orders (Protected, Store Specific)
router.get('/:storeId/vendor-orders', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ _id: req.params.storeId, admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

    const orders = await Order.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Order Status (Protected)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Security check: Make sure order belongs to this vendor
    const order = await Order.findById(req.params.id).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.store.admin.toString() !== req.admin._id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.status = status;
    const updatedOrder = await order.save();

    // Notify customer about status update using Socket.io
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept Order (Vendor)
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.store.admin.toString() !== req.admin._id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.status = 'Accepted';
    const updatedOrder = await order.save();

    // Notify customer about order acceptance
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_update', updatedOrder);

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject Order (Vendor)
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.store.admin.toString() !== req.admin._id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.status = 'Rejected';
    const updatedOrder = await order.save();

    // Notify customer about order rejection
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_update', updatedOrder);

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request Payment Verification (Customer)
router.put('/:id/request-verification', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    order.paymentStatus = 'Verification Requested';
    const savedOrder = await order.save();
    
    // Notify vendor
    const io = req.app.get('io');
    io.to(order.store.toString()).emit('new_order', savedOrder); // Resend as update
    
    res.json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify Payment (Vendor)
router.put('/:id/verify-payment', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.store.admin.toString() !== req.admin._id) return res.status(403).json({ message: 'Unauthorized' });
    
    order.paymentStatus = 'Confirmed';
    order.status = 'Confirmed';
    const savedOrder = await order.save();
    
    // Notify customer
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_status_update', savedOrder);
    
    // Notify vendor about new confirmed order (for UPI orders)
    if (order.paymentMethod === 'UPI') {
      io.to(order.store.toString()).emit('new_order', savedOrder);
    }
    
    res.json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel Order (Customer)
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Only allow cancellation of orders with 'Payment Pending' status
    if (order.status !== 'Payment Pending') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    // Notify vendor about cancellation
    const io = req.app.get('io');
    io.to(order.store.toString()).emit('order_cancelled', order);
    
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Single Order Status (Public, for customer tracking)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: 'store',
      populate: { path: 'admin', select: 'upiId name' }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
