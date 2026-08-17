const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Admin = require('../models/Admin');
const notificationService = require('../services/notificationService');

const crypto = require('crypto');

// Helper to generate a unique 4-digit order number
const generateOrderNumber = () => Math.floor(1000 + Math.random() * 9000).toString();

// Generate a cryptographically secure random token (hex string)
const generateSecureToken = () => crypto.randomBytes(16).toString('hex');

// Create a new Order (Public Customer endpoint)
// NOTE: For Razorpay checkouts, use the /api/payments/razorpay/verify endpoint
// which creates the order ONLY after successful payment to avoid DB clutter.
router.post('/create', async (req, res) => {
  try {
    const { storeId, items, totalAmount, paymentMethod, customerPhone, customerName, orderType, packagingChargeApplied, isPreOrder, scheduledTime, isQRScan } = req.body;

    const store = await Store.findById(storeId).populate('admin');
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Consistent logic: QR Scans have no timer (null deadline)
    // Pre-orders have 15 mins. Direct ASAP orders have 5 mins.
    let deadlineMinutes = isPreOrder ? 15 : (isQRScan ? null : 5);
    
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
    
    // 1. Authorize: Ensure user has permissions
    if (req.admin.role === 'staff') {
      const perms = req.admin.permissions || [];
      if (!perms.includes('UPDATE_ORDER_STATUS') && !perms.includes('MARK_ORDER_READY')) {
        return res.status(403).json({ message: 'Unauthorized: Missing required permissions' });
      }
      if (status === 'Ready' && !perms.includes('MARK_ORDER_READY')) {
        return res.status(403).json({ message: 'Unauthorized: Missing MARK_ORDER_READY permission' });
      }
    }

    // 2. Strict State Machine Rules
    // Maps the Target Status to the Required Current Status(es)
    const validTransitions = {
      'Confirmed': ['Pending'],
      'Cooking': ['Confirmed'],
      'Ready': ['Cooking'],
      'Cancelled': ['Payment Pending', 'Pending'] 
    };

    if (status === 'Completed') {
      return res.status(400).json({ message: 'Orders can only be completed via secure QR Handover.' });
    }

    if (!validTransitions[status]) {
       return res.status(400).json({ message: 'Invalid or unsupported status transition requested.' });
    }

    const expectedCurrentStatuses = validTransitions[status];
    const authorizedStoreId = req.admin.storeId || req.admin._id;

    // PRE-ORDER STRICT TIME LOCK
    const existingOrderCheck = await Order.findById(req.params.id);
    if (!existingOrderCheck) return res.status(404).json({ message: 'Order not found' });
    
    if (existingOrderCheck.isPreOrder && existingOrderCheck.scheduledTime) {
      if (status === 'Cooking' || status === 'Ready') {
        const [hours, minutes] = existingOrderCheck.scheduledTime.split(':').map(Number);
        const now = new Date();
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        const diffMs = scheduledDate.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        if (diffMins > 20) {
          return res.status(403).json({ message: `Too early to prepare! Please wait until there is less than 20 minutes left. (Current: ${Math.round(diffMins)} mins left)` });
        }
      }
    }

    // 3. Atomic Conditional Update & Token Generation
    const updatePayload = { $set: { status: status } };
    
    // Generate handover token when transitioning to Ready.
    // Since strict validTransitions ensure we are ONLY coming from 'Cooking', we know it doesn't have a token yet.
    if (status === 'Ready') {
      updatePayload.$set.handoverToken = generateSecureToken();
      // Set expiry to 24 hours from generation
      updatePayload.$set.handoverTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // This entirely prevents Race Conditions if two cooks tap "Confirm" simultaneously
    const updatedOrder = await Order.findOneAndUpdate(
      { 
        _id: req.params.id, 
        store: authorizedStoreId, // Ensures order belongs to this store
        status: { $in: expectedCurrentStatuses } // Must currently be in expected state
      },
      updatePayload,
      { returnDocument: 'after' }
    ).populate('store').select('+handoverToken');

    if (!updatedOrder) {
      // If update failed, determine exactly why (Race condition vs Not Found vs Unauthorized)
      const existingOrder = await Order.findById(req.params.id);
      if (!existingOrder) return res.status(404).json({ message: 'Order not found' });
      
      if (existingOrder.store.toString() !== authorizedStoreId.toString()) {
         return res.status(403).json({ message: 'Unauthorized: Order belongs to another store.' });
      }

      return res.status(409).json({ 
        message: `Order has already been processed or moved to ${existingOrder.status}. Transition to ${status} is invalid.`,
        currentStatus: existingOrder.status 
      });
    }

    const io = req.app.get('io');
    // Notify customer
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);
    // Notify store room
    io.to(updatedOrder.store._id.toString()).emit('order_status_update', updatedOrder);

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
    // We explicitly select +handoverToken here so the tracking page can generate the QR code
    // The tracking page ONLY displays the QR code if status === 'Ready'
    const order = await Order.findById(req.params.id).select('+handoverToken').populate({
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
    const { orderId, handoverToken } = req.body;

    if (!orderId || !handoverToken) {
      return res.status(400).json({ message: 'Order ID and Handover Token are required' });
    }

    const authorizedStoreId = req.admin.storeId || req.admin._id;

    // ATOMIC VERIFICATION AND CONSUMPTION
    // Query requires the order to be exactly in the Ready state with an unused, matching token
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        store: authorizedStoreId,         // Verify store ownership
        status: 'Ready',                  // Must be currently READY
        handoverToken: handoverToken,     // Must precisely match the cryptographically secure token
        handoverTokenUsedAt: null,        // Must be entirely unused
        $or: [
          { handoverTokenExpiresAt: { $gt: new Date() } },
          { handoverTokenExpiresAt: null }
        ]
      },
      {
        $set: {
          status: 'Completed',
          handoverTokenUsedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    ).populate('store');

    if (!updatedOrder) {
      // Differentiate why it failed for better UX
      const existingOrder = await Order.findById(orderId).select('+handoverTokenUsedAt');
      if (!existingOrder) return res.status(404).json({ message: 'Order not found' });
      
      if (existingOrder.store.toString() !== authorizedStoreId.toString()) {
        return res.status(403).json({ message: 'Unauthorized: Order belongs to another store' });
      }

      if (existingOrder.status === 'Completed' || existingOrder.handoverTokenUsedAt) {
        return res.status(409).json({ message: 'Order already handed over and completed.' });
      }

      if (existingOrder.status !== 'Ready') {
        return res.status(409).json({ message: `Cannot handover. Order is currently in ${existingOrder.status} state.` });
      }

      return res.status(400).json({ message: 'Invalid or expired handover token.' });
    }

    // Notify customer about status update
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);
    
    // Also notify vendors in the store room so dashboards update
    io.to(updatedOrder.store._id.toString()).emit('order_status_update', updatedOrder);

    res.json({ success: true, message: 'Handover verified and order completed', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
