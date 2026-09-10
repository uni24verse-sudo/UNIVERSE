const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Store = require('../models/Store');
const paymentConfig = require('../config/payments.js');
const telegramService = require('../services/telegramService');
const journeyEngineService = require('../services/journeyEngineService');

// Helper to obtain active Razorpay instance
const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || paymentConfig.razorpay.keyId,
  key_secret: process.env.RAZORPAY_KEY_SECRET || paymentConfig.razorpay.keySecret
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

    const razorpay = getRazorpay();
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
      keyId: process.env.RAZORPAY_KEY_ID || paymentConfig.razorpay.keyId
    });

  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    const errorMsg = error?.error?.description || error?.message || 'Failed to create Razorpay order';
    res.status(500).json({ message: errorMsg });
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
    const secret = process.env.RAZORPAY_KEY_SECRET || paymentConfig.razorpay.keySecret;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Payment verified - NOW Create the Order in DB
    const { storeId, items, totalAmount, paymentMethod, customerPhone, customerName, orderType, packagingChargeApplied, isPreOrder, scheduledTime, isQRScan } = orderData;

    const store = await Store.findById(storeId).populate('admin').populate('locationId');
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Set acceptance deadline: 
    // 15 mins for pre-orders
    // For QR Scans (Physical Presence), we disable the timer (null)
    // Otherwise, 5 mins for ASAP orders
    let deadlineMinutes = isPreOrder ? 15 : (isQRScan ? null : 5);
    
    // For Restaurants, we follow user request: simple flow, usually no timer if QR scan
    // If not a QR scan, they get the standard 5 min deadline to prevent spam
    const acceptDeadline = deadlineMinutes ? new Date(Date.now() + deadlineMinutes * 60 * 1000) : null;

    // Customer Identity: Get or Create Stable Customer Profile
    const auditService = require('../services/auditService');
    const Payment = require('../models/Payment');

    const campusName = store.locationId?.name 
      ? `${store.locationId.name}${store.market ? ' • ' + store.market : ''}` 
      : (store.market ? `Lovely Professional University • ${store.market}` : 'Lovely Professional University');

    const customer = await auditService.getOrCreateCustomer({
      phone: customerPhone,
      name: customerName,
      email: orderData.customerEmail || '',
      campus: campusName
    });

    // Capture payer UPI ID / VPA if payment was made via UPI
    let payerUpiId = null;
    try {
      const razorpay = getRazorpay();
      const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
      if (rzpPayment && rzpPayment.vpa) {
        payerUpiId = rzpPayment.vpa;
      }
    } catch (fetchErr) {
      console.warn('[Payments] Could not fetch Razorpay payment VPA details:', fetchErr.message);
    }

    const newOrder = new Order({
      store: storeId,
      orderNumber: generateOrderNumber(),
      items,
      totalAmount,
      paymentMethod: paymentMethod || 'Razorpay',
      userId: customer ? customer.userId : null,
      customerPhone,
      customerName,
      customerEmail: orderData.customerEmail || (customer?.email || ''),
      orderType,
      packagingChargeApplied,
      paymentStatus: 'Confirmed',
      status: 'Pending',
      transactionId: razorpay_payment_id,
      paymentProvider: 'Razorpay',
      payerUpiId,
      customerUpiId: payerUpiId || null,
      acceptDeadline,
      handoverToken: generateHandoverToken(),
      isPreOrder: isPreOrder || false,
      scheduledTime: scheduledTime || null
    });

    const savedOrder = await newOrder.save();

    // Financial Ledger: Record Captured Payment
    await Payment.create({
      paymentId: razorpay_payment_id,
      orderId: savedOrder._id,
      userId: customer ? customer.userId : 'GUEST',
      amount: totalAmount,
      currency: 'INR',
      status: 'CAPTURED',
      method: 'Razorpay',
      capturedAt: new Date(),
      rawResponse: { razorpay_order_id, razorpay_payment_id }
    }).catch(err => console.error('[PaymentLedger] Error saving payment:', err.message));

    // Audit Trail: Log Immutable Event
    await auditService.logEvent({
      orderId: savedOrder._id,
      orderNumber: savedOrder.orderNumber,
      userId: customer ? customer.userId : 'GUEST',
      actorType: 'CUSTOMER',
      actorId: customer ? customer.userId : customerPhone,
      eventType: 'PAYMENT_CAPTURED',
      oldStatus: 'Payment Pending',
      newStatus: 'Pending',
      metadata: {
        paymentId: razorpay_payment_id,
        amount: totalAmount,
        storeName: store?.name || 'Campus Outlet'
      }
    });

    // Trigger Lifecycle Journey Automation (First Lifetime Order vs Repeat Order)
    if (savedOrder.customerPhone) {
      const userPayload = {
        userId: customer ? customer.userId : savedOrder.customerPhone,
        name: savedOrder.customerName || 'Student',
        phone: savedOrder.customerPhone,
        metadata: {
          orderId: savedOrder.orderNumber || savedOrder._id.toString(),
          orderNumber: savedOrder.orderNumber || '',
          storeName: store?.name || 'Campus Food Court',
          amount: savedOrder.totalAmount
        }
      };

      // 1. Trigger Order Placed Journey
      journeyEngineService.triggerEvent('Order Placed', userPayload)
        .catch(e => console.error('[JourneyEngine] Order Placed trigger error:', e.message));

      // 2. Trigger First Order or Repeat Order Journey
      Order.countDocuments({ customerPhone: savedOrder.customerPhone }).then(orderCount => {
        const triggerEvent = orderCount === 1 ? 'First Lifetime Order' : 'Repeat Order Placed';
        return journeyEngineService.triggerEvent(triggerEvent, userPayload);
      }).catch(e => console.error('[JourneyEngine] Payment order trigger error:', e.message));
    }

const pushService = require('../services/pushService');

    // Notify vendor via Socket.io (Foreground Sync)
    const io = req.app.get('io');
    io.to(storeId.toString()).emit('new_order', savedOrder);
    io.to('superadmin_room').emit('superadmin:new_order', savedOrder);

    // Compute active badge count
    const activeOrdersCount = await Order.countDocuments({
      store: storeId,
      status: { $in: ['Pending', 'Confirmed', 'Cooking'] }
    });

    // Format rich push notification with full itemized details
    const itemsSummary = savedOrder.items.map(item => {
      let itemStr = `• ${item.quantity}x ${item.name}`;
      if (item.variant) {
        itemStr += ` (${item.variant})`;
      }
      
      if (item.isCombo) {
        const subItems = [];
        if (item.comboItems && item.comboItems.length > 0) {
          subItems.push(...item.comboItems.map(ci => `${ci.quantity} ${ci.name}`));
        }
        if (item.freeItems && item.freeItems.length > 0) {
          subItems.push(...item.freeItems.map(fi => `+Free ${fi.quantity} ${fi.name}`));
        }
        if (subItems.length > 0) {
          itemStr += `\n   ↳ [${subItems.join(', ')}]`;
        }
      }
      return itemStr;
    }).join('\n');

    const orderTypeLabel = savedOrder.isPreOrder 
      ? `⏰ Pre-Order (${savedOrder.scheduledTime})` 
      : (savedOrder.orderType === 'Take Away' ? '🛍️ Take Away' : '🍽️ Dine In');
    
    const customerInfo = savedOrder.customerName ? `👤 ${savedOrder.customerName} ` : '';
    const notifTitle = `🔔 Order #${savedOrder.orderNumber} (${orderTypeLabel})`;
    const notifBody = `${customerInfo}(₹${savedOrder.totalAmount})\n${itemsSummary}`;

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
      'orders_alarm' // Use explicit alarm channel created by Android app
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
    res.status(500).json({ message: `Order creation failed after payment: ${error.message}` });
  }
});

module.exports = router;
