const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Admin = require('../models/Admin');
const notificationService = require('../services/notificationService');

// Helper to generate a unique 4-digit order number
const generateOrderNumber = () => Math.floor(1000 + Math.random() * 9000).toString();

// Helper to generate a unique handover token
const generateHandoverToken = () => Math.random().toString(36).substring(2, 10).toUpperCase();

// Create a new Order (Public Customer endpoint)
// NOTE: For Razorpay checkouts, use the /api/payments/razorpay/verify endpoint
// which creates the order ONLY after successful payment to avoid DB clutter.
router.post('/create', async (req, res) => {
  try {
    const { storeId, items, totalAmount, paymentMethod, customerPhone, customerName, orderType, packagingChargeApplied, isPreOrder, scheduledTime } = req.body;

    const store = await Store.findById(storeId).populate('admin');
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Set acceptance deadline: 15 mins for pre-orders, 3 mins for ASAP vendors
    // For Restaurants, we set no deadline (null) to allow manual control
    let deadlineMinutes = isPreOrder ? 15 : (store.storeType === 'Restaurant' ? null : 3);
    
    let acceptDeadline = deadlineMinutes ? new Date(Date.now() + deadlineMinutes * 60 * 1000) : null;

    const newOrder = new Order({
      store: storeId,
      orderNumber: generateOrderNumber(),
      items,
      totalAmount,
      paymentMethod,
      customerPhone,
      customerName,
      orderType,
      packagingChargeApplied,
      status: 'Payment Pending',
      paymentStatus: 'Pending',
      acceptDeadline,
      handoverToken: generateHandoverToken(),
      isPreOrder: isPreOrder || false,
      scheduledTime: scheduledTime || null
    });

    const savedOrder = await newOrder.save();

    // Don't notify vendor yet - wait for payment confirmation via Razorpay verify endpoint
    console.log(`Order #${savedOrder.orderNumber} created, awaiting payment...`);

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

    const orders = await Order.find({ 
      store: store._id,
      status: { $ne: 'Payment Pending' }
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Order Status (Protected)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.store.admin.toString() !== req.admin._id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.status = status;
    const updatedOrder = await order.save();

    // Notify customer about status update
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel Order (Customer - only if Payment Pending)
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (order.status !== 'Payment Pending') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
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
      populate: { path: 'admin', select: 'name' }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify Order Handover via QR (Protected)
router.put('/verify-handover', auth, async (req, res) => {
  try {
    const { orderId, token } = req.body;

    if (!orderId || !token) {
      return res.status(400).json({ message: 'Order ID and Token are required' });
    }

    const order = await Order.findById(orderId).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Verify ownership
    if (order.store.admin.toString() !== req.admin._id) {
      return res.status(403).json({ message: 'Unauthorized: Only the vendor can verify this handover' });
    }

    // Verify token
    if (order.handoverToken !== token) {
      return res.status(400).json({ message: 'Invalid handover token' });
    }

    if (order.status === 'Completed') {
      return res.status(400).json({ message: 'Order is already marked as completed' });
    }

    order.status = 'Completed';
    const updatedOrder = await order.save();

    // Notify customer about status update
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);
    
    // Also notify vendors in the store room so dashboards update
    io.to(order.store._id.toString()).emit('order_status_update', updatedOrder);

    res.json({ success: true, message: 'Handover verified and order completed', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
