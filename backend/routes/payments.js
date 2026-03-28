const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Store = require('../models/Store');
const paymentConfig = require('../config/payments.js');
const notificationService = require('../services/notificationService');

const razorpay = new Razorpay({
  key_id: paymentConfig.razorpay.keyId,
  key_secret: paymentConfig.razorpay.keySecret
});

// 1. CREATE RAZORPAY ORDER
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `order_${order.orderNumber}_${Date.now()}`,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        storeId: order.store._id.toString()
      }
    });

    order.transactionId = razorpayOrder.id;
    order.paymentProvider = 'Razorpay';
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: paymentConfig.razorpay.keyId
    });

  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
});

// 2. VERIFY RAZORPAY PAYMENT
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', paymentConfig.razorpay.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Payment verified - update order
    const order = await Order.findById(orderId).populate({
      path: 'store',
      populate: { path: 'admin' }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.paymentStatus = 'Confirmed';
    order.status = 'Pending';
    order.transactionId = razorpay_payment_id;
    await order.save();

    // Notify vendor via Socket.io
    const io = req.app.get('io');
    io.to(order.store._id.toString()).emit('new_order', order);

    // Push notification to vendor
    if (order.store && order.store.admin) {
      const notificationData = {
        title: '💰 New Paid Order!',
        body: `Order #${order.orderNumber} - ₹${order.totalAmount} (Paid Online)`,
        orderId: order._id,
        type: 'new_order',
        clickAction: `/vendor/dashboard`
      };
      await notificationService.sendToUser(order.store.admin._id || order.store.admin, notificationData);
    }

    console.log(`Order #${order.orderNumber} successfully paid via Razorpay.`);

    res.json({ success: true, message: 'Payment verified successfully', order });

  } catch (error) {
    console.error('Razorpay Verification Error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

module.exports = router;
