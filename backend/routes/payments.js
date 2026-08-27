const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Store = require('../models/Store');
const paymentConfig = require('../config/payments.js');
const telegramService = require('../services/telegramService');

const razorpay = new Razorpay({
  key_id: paymentConfig.razorpay.keyId,
  key_secret: paymentConfig.razorpay.keySecret
});

// Helper to generate a unique 4-digit order number
const generateOrderNumber = () => Math.floor(1000 + Math.random() * 9000).toString();

// Helper to generate a unique handover token
const generateHandoverToken = () => Math.random().toString(36).substring(2, 10).toUpperCase();

// 1. CREATE RAZORPAY ORDER (Directly, without saving to DB yet)
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { amount, storeId } = req.body;
    
    if (!amount || !storeId) {
      return res.status(400).json({ message: 'Amount and storeId are required' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `order_rcpt_${Date.now()}`,
      notes: {
        storeId: storeId.toString()
      }
    });

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

// 2. VERIFY RAZORPAY PAYMENT & CREATE ORDER
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    if (!orderData) {
      return res.status(400).json({ message: 'Order data is required for verification' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', paymentConfig.razorpay.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Payment verified - NOW Create the Order in DB
    const { storeId, items, totalAmount, paymentMethod, customerPhone, customerName, orderType, packagingChargeApplied, isPreOrder, scheduledTime, isQRScan } = orderData;

    const store = await Store.findById(storeId).populate('admin');
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Set acceptance deadline: 
    // 15 mins for pre-orders
    // For QR Scans (Physical Presence), we disable the timer (null)
    // Otherwise, 5 mins for ASAP orders
    let deadlineMinutes = isPreOrder ? 15 : (isQRScan ? null : 5);
    
    // For Restaurants, we follow user request: simple flow, usually no timer if QR scan
    // If not a QR scan, they get the standard 5 min deadline to prevent spam
    const acceptDeadline = deadlineMinutes ? new Date(Date.now() + deadlineMinutes * 60 * 1000) : null;

    const newOrder = new Order({
      store: storeId,
      orderNumber: generateOrderNumber(),
      items,
      totalAmount,
      paymentMethod: paymentMethod || 'Razorpay',
      customerPhone,
      customerName,
      orderType,
      packagingChargeApplied,
      paymentStatus: 'Confirmed',
      status: 'Pending',
      transactionId: razorpay_payment_id,
      paymentProvider: 'Razorpay',
      acceptDeadline,
      handoverToken: generateHandoverToken(),
      isPreOrder: isPreOrder || false,
      scheduledTime: scheduledTime || null
    });

    const savedOrder = await newOrder.save();

const pushService = require('../services/pushService');

    // Notify vendor via Socket.io (Foreground Sync)
    const io = req.app.get('io');
    io.to(storeId.toString()).emit('new_order', savedOrder);

    // Compute active badge count
    const activeOrdersCount = await Order.countDocuments({
      store: storeId,
      status: { $in: ['Pending', 'Confirmed', 'Cooking'] }
    });

    // Format rich push notification with full itemized details
    const itemsSummary = (savedOrder.items || []).map(item => {
      let itemStr = `${item.quantity}x ${item.name || 'Item'}`;
      if (item.variant) itemStr += ` (${item.variant})`;
      return itemStr;
    }).join(', ');

    const orderTypeLabel = savedOrder.isPreOrder 
      ? `⏰ Pre-Order (${savedOrder.scheduledTime})` 
      : (savedOrder.orderType === 'Take Away' ? '🛍️ Take Away' : '🍽️ Dine In');
    
    const customerInfo = savedOrder.customerName ? ` • 👤 ${savedOrder.customerName}` : '';
    const notifTitle = `🔔 Order #${savedOrder.orderNumber} (${orderTypeLabel})`;
    const notifBody = `${itemsSummary} • ₹${savedOrder.totalAmount}${customerInfo}`;

    // Notify vendor via FCM/Expo Push Notifications (Background)
    pushService.sendStoreNotification(
      storeId.toString(),
      notifTitle,
      notifBody,
      { 
        orderId: savedOrder._id, 
        orderNumber: savedOrder.orderNumber,
        totalAmount: savedOrder.totalAmount,
        itemsSummary,
        orderType: savedOrder.orderType,
        isPreOrder: savedOrder.isPreOrder,
        scheduledTime: savedOrder.scheduledTime
      },
      'order_pending',
      activeOrdersCount,
      'orders_alarm' // The custom alarm channel
    );

    // Notify vendor via Telegram
    if (store) {
      telegramService.sendOrderAlert(store, savedOrder).catch(err => {
        console.error('Telegram alert failed:', err.message);
      });
    }

    console.log(`Order #${savedOrder.orderNumber} successfully created after payment verification.`);

    res.json({ success: true, message: 'Order created successfully', order: savedOrder });

  } catch (error) {
    console.error('Razorpay Verification & Creation Error:', error);
    res.status(500).json({ message: 'Order creation failed after payment' });
  }
});

module.exports = router;
