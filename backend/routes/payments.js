const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const Store = require('../models/Store');
const paymentConfig = require('../config/payments.js');
const notificationService = require('../services/notificationService');

// 1. INITIATE CASHFREE PAYMENT
router.post('/cashfree/initiate', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const appId = paymentConfig.cashfree.appId;
    const secretKey = paymentConfig.cashfree.secretKey;
    const isProd = paymentConfig.cashfree.env === 'PRODUCTION';
    const baseUrl = isProd ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders';

    const cashfreeOrderId = `CF_${order.orderNumber}_${Date.now()}`;
    
    order.transactionId = cashfreeOrderId;
    order.paymentProvider = 'Cashfree';
    await order.save();

    const payload = {
      order_amount: +(order.totalAmount).toFixed(2),
      order_currency: "INR",
      order_id: cashfreeOrderId,
      customer_details: {
        customer_id: `CUST_${order.customerPhone || 'GUEST'}`,
        customer_phone: order.customerPhone || '9999999999',
        customer_name: "Customer",
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/order-tracker/${order._id}?order_id={order_id}&cf_msg={order_status}`,
        notify_url: `${process.env.BACKEND_URL}/api/payments/cashfree/webhook`
      }
    };

    const response = await axios.post(baseUrl, payload, {
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      transactionId: cashfreeOrderId
    });

  } catch (error) {
    console.error('Cashfree Initiation Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to initiate Cashfree payment' });
  }
});

// 2. CASHFREE WEBHOOK
router.post('/cashfree/webhook', async (req, res) => {
  try {
    const ts = req.headers['x-webhook-timestamp'];
    const signature = req.headers['x-webhook-signature'];
    
    // According to Cashfree docs, raw rawBody is needed for signature verification
    // For json middleware, we can just stringify req.body or handle rawBody using custom middleware
    // We'll use the JSON serialization here, which works in a pinch if formatting is preserved
    // Best practice is to construct dataToVerify exactly as cashfree sent it
    const bodyString = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const dataToVerify = ts + bodyString;
    
    const secretKey = paymentConfig.cashfree.secretKey;
    const expectedSignature = crypto.createHmac('sha256', secretKey).update(dataToVerify).digest('base64');
    
    if (signature !== expectedSignature) {
      console.warn('Cashfree Webhook Security: Signature mismatch!');
      return res.status(401).send('Unauthorized');
    }

    if (req.body.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = req.body.data.order.order_id;
      
      const order = await Order.findOne({ transactionId: orderId }).populate({
        path: 'store',
        populate: { path: 'admin' }
      });

      if (!order) return res.status(404).send('Order not found');

      if (order.paymentStatus !== 'Confirmed') {
        order.paymentStatus = 'Confirmed';
        order.status = 'Pending';
        await order.save();

        // 🔔 NOTIFY VENDOR
        const io = req.app.get('io');
        io.to(order.store._id.toString()).emit('new_order', order);

        // 🔔 PUSH NOTIFICATION
        if (order.store && order.store.admin) {
          const notificationData = {
            title: '💰 New Paid Order!',
            body: `Order #${order.orderNumber} - ₹${order.totalAmount} (Paid via Cashfree)`,
            orderId: order._id,
            type: 'new_order',
            clickAction: `/vendor/dashboard`
          };
          await notificationService.sendToUser(order.store.admin._id || order.store.admin, notificationData);
        }
        
        console.log(`Order #${order.orderNumber} successfully paid via Cashfree.`);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Cashfree Webhook Error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
