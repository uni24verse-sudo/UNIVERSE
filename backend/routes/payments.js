const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { normalizeOrder } = require('../utils/pgAdapter');
const paymentConfig = require('../config/payments.js');
const telegramService = require('../services/telegramService');
const journeyEngineService = require('../services/journeyEngineService');
const auditService = require('../services/auditService');
const pushService = require('../services/pushService');
const pricingEngine = require('../utils/pricingEngine');
const globalOfferRepository = require('../repositories/globalOfferRepository');

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

    const store = await prisma.store.findUnique({
      where: { id: String(storeId) }
    });
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
    console.error('[Payments] Razorpay Order Creation Error:', error);
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

    // Payment verified - NOW Create the Order in PostgreSQL
    const { storeId, items, totalAmount, paymentMethod, customerPhone, customerName, orderType, packagingChargeApplied, isPreOrder, scheduledTime, isQRScan } = orderData;

    const store = await prisma.store.findUnique({
      where: { id: String(storeId) },
      include: { admin: true, location: true }
    });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const isAutoAccept = Boolean(store?.autoAcceptOrders);
    const initialStatus = isAutoAccept ? 'Confirmed' : 'Pending';

    let deadlineMinutes = isAutoAccept ? null : (isPreOrder ? 15 : (isQRScan ? null : 5));
    const acceptDeadline = deadlineMinutes ? new Date(Date.now() + deadlineMinutes * 60 * 1000) : null;

    const campusName = store.location?.name 
      ? `${store.location.name}${store.market ? ' • ' + store.market : ''}` 
      : (store.market ? `Lovely Professional University • ${store.market}` : 'Lovely Professional University');

    const customer = await auditService.getOrCreateCustomer({
      phone: customerPhone,
      name: customerName,
      email: orderData.customerEmail || '',
      campus: campusName
    });

    const globalOffers = await globalOfferRepository.getActive(orderData.storeId).catch(() => []);

    const pricing = pricingEngine.calculateCartPricing(store, items, {
      orderType: orderType || 'Dine In',
      selectedOfferId: orderData.selectedOfferId,
      couponCode: orderData.couponCode,
      removeOffer: orderData.removeOffer,
      globalOffers
    });

    // Capture payer UPI ID / VPA if payment was made via UPI
    let payerUpiId = '';
    try {
      const razorpay = getRazorpay();
      const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
      if (rzpPayment && rzpPayment.vpa) {
        payerUpiId = rzpPayment.vpa;
      }
    } catch (fetchErr) {
      console.warn('[Payments] Could not fetch Razorpay payment VPA details:', fetchErr.message);
    }

    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();
    const handoverToken = generateHandoverToken();

    const createdOrder = await prisma.order.create({
      data: {
        id: orderId,
        storeId: String(storeId),
        orderNumber,
        items: Array.isArray(items) ? items : [],
        totalAmount: pricing.finalTotal > 0 ? pricing.finalTotal : (Number(totalAmount) || 0),
        discountAmount: pricing.discountAmount || 0,
        appliedOffer: pricing.appliedOffer || {},
        paymentMethod: paymentMethod || 'Razorpay',
        userId: customer ? customer.userId : '',
        customerPhone: String(customerPhone || ''),
        customerName: customerName || 'UniVerse Student',
        customerEmail: orderData.customerEmail || (customer?.email || ''),
        orderType: orderType || 'Dine In',
        packagingChargeApplied: pricing.packagingFee,
        paymentStatus: 'Confirmed',
        status: initialStatus,
        transactionId: razorpay_payment_id,
        paymentProvider: 'Razorpay',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        payerUpiId: payerUpiId || '',
        customerUpiId: payerUpiId || '',
        handoverToken,
        isPreOrder: Boolean(isPreOrder),
        scheduledTime: scheduledTime || ''
      },
      include: { store: true }
    });

    const savedOrder = normalizeOrder(createdOrder);

    // Financial Ledger: Record Captured Payment
    await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        paymentId: razorpay_payment_id,
        orderId: savedOrder.id,
        userId: customer ? customer.userId : 'GUEST',
        amount: Number(totalAmount) || 0,
        currency: 'INR',
        status: 'CAPTURED',
        method: 'Razorpay',
        capturedAt: new Date(),
        rawResponse: { razorpay_order_id, razorpay_payment_id }
      }
    }).catch(err => console.error('[PaymentLedger] Error saving payment:', err.message));

    // Audit Trail: Log Immutable Event
    await auditService.logEvent({
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      userId: customer ? customer.userId : 'GUEST',
      actorType: isAutoAccept ? 'SYSTEM' : 'CUSTOMER',
      actorId: isAutoAccept ? 'AUTO_ACCEPT' : (customer ? customer.userId : customerPhone),
      eventType: isAutoAccept ? 'ORDER_AUTO_ACCEPTED' : 'PAYMENT_CAPTURED',
      oldStatus: 'Payment Pending',
      newStatus: initialStatus,
      metadata: {
        paymentId: razorpay_payment_id,
        amount: totalAmount,
        storeName: store?.name || 'Campus Outlet',
        autoAccepted: isAutoAccept
      }
    });

    // Trigger Lifecycle Journey Automation (First Lifetime Order vs Repeat Order)
    if (savedOrder.customerPhone) {
      const userPayload = {
        userId: customer ? customer.userId : savedOrder.customerPhone,
        name: savedOrder.customerName || 'Student',
        phone: savedOrder.customerPhone,
        metadata: {
          orderId: savedOrder.orderNumber || savedOrder.id,
          orderNumber: savedOrder.orderNumber || '',
          storeName: store?.name || 'Campus Food Court',
          amount: savedOrder.totalAmount
        }
      };

      // 1. Trigger Order Placed Journey
      journeyEngineService.triggerEvent('Order Placed', userPayload)
        .catch(e => console.error('[JourneyEngine] Order Placed trigger error:', e.message));

      if (isAutoAccept) {
        journeyEngineService.triggerEvent('Order Accepted', userPayload)
          .catch(e => console.error('[JourneyEngine] Auto-accept trigger error:', e.message));
      }

      // 2. Trigger First Order or Repeat Order Journey
      prisma.order.count({ where: { customerPhone: savedOrder.customerPhone } }).then(orderCount => {
        const triggerEvent = orderCount === 1 ? 'First Lifetime Order' : 'Repeat Order Placed';
        return journeyEngineService.triggerEvent(triggerEvent, userPayload);
      }).catch(e => console.error('[JourneyEngine] Payment order trigger error:', e.message));
    }

    // Notify vendor via Socket.io (Foreground Sync)
    const io = req.app.get('io');
    if (io) {
      io.to(storeId.toString()).emit('new_order', savedOrder);
      io.to('superadmin_room').emit('superadmin:new_order', savedOrder);
    }

    // Compute active badge count
    const activeOrdersCount = await prisma.order.count({
      where: {
        storeId: String(storeId),
        status: { in: ['Pending', 'Confirmed', 'Cooking'] }
      }
    });

    // Format rich push notification with full itemized details
    const orderItems = Array.isArray(savedOrder.items) ? savedOrder.items : [];
    const itemsSummary = orderItems.map(item => {
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
        orderId: savedOrder.id, 
        orderNumber: savedOrder.orderNumber,
        totalAmount: savedOrder.totalAmount,
        itemsSummary,
        orderType: savedOrder.orderType,
        isPreOrder: savedOrder.isPreOrder,
        scheduledTime: savedOrder.scheduledTime
      },
      'order_pending',
      activeOrdersCount,
      'orders_alarm'
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
