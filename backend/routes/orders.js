const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Store = require('../models/Store');

// Helper to generate a unique 4-digit order number
const generateOrderNumber = () => Math.floor(1000 + Math.random() * 9000).toString();

// Create a new Order (Public Customer endpoint)
router.post('/create', async (req, res) => {
  try {
    const { storeId, items, totalAmount, paymentMethod, customerPhone } = req.body;

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const newOrder = new Order({
      store: storeId,
      orderNumber: generateOrderNumber(),
      items,
      totalAmount,
      paymentMethod,
      customerPhone,
      status: 'Pending',
      paymentStatus: 'Pending'
    });

    const savedOrder = await newOrder.save();

    // Emit socket event to the vendor's room (using storeId as room name)
    const io = req.app.get('io');
    io.to(storeId).emit('new_order', savedOrder);

    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Vendor's Orders (Protected)
router.get('/vendor-orders', auth, async (req, res) => {
  try {
    const store = await Store.findOne({ admin: req.admin._id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

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

    // Notify customer about status update using order ID as room
    const io = req.app.get('io');
    io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);

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
    
    res.json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request Refund (Customer)
router.put('/:id/request-refund', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Can only refund if not already completed
    if (order.status === 'Completed') return res.status(400).json({ message: 'Cannot refund completed order' });
    
    order.paymentStatus = 'Refund Requested';
    order.status = 'Cancelled';
    const savedOrder = await order.save();
    
    // Notify vendor
    const io = req.app.get('io');
    io.to(order.store.toString()).emit('new_order', savedOrder);
    
    res.json(savedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Process Refund (Vendor)
router.put('/:id/process-refund', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.store.admin.toString() !== req.admin._id) return res.status(403).json({ message: 'Unauthorized' });
    
    order.paymentStatus = 'Refunded';
    const savedOrder = await order.save();
    
    // Notify customer
    const io = req.app.get('io');
    io.to(order._id.toString()).emit('order_status_update', savedOrder);
    
    res.json(savedOrder);
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
