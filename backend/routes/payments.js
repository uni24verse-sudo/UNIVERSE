const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const Store = require('../models/Store');
const paymentConfig = require('../config/payments.js');
const notificationService = require('../services/notificationService');

// Helper to generate SHA256 checksum for PhonePe
const generatePhonePeChecksum = (payload, endpoint, saltKey, saltIndex) => {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const fullURL = base64Payload + endpoint + saltKey;
  const hash = crypto.createHash('sha256').update(fullURL).digest('hex');
  return `${hash}###${saltIndex}`;
};

// 1. INITIATE PHONEPE PAYMENT
router.post('/phonepe/initiate', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate({
      path: 'store',
      populate: { path: 'admin' }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const vendor = order.store.admin;
    
    // Choose keys: Vendor Specific OR Global Fallback
    const mid = vendor.phonepeMerchantId || paymentConfig.phonepe.merchantId;
    const mkey = vendor.phonepeSaltKey || paymentConfig.phonepe.saltKey;
    const mindex = vendor.phonepeSaltIndex || paymentConfig.phonepe.saltIndex;

    const merchantTransactionId = `TXN_${uuidv4().substring(0, 8)}_${order.orderNumber}`;
    order.transactionId = merchantTransactionId;
    order.paymentProvider = 'PhonePe';
    await order.save();

    const payload = {
      merchantId: mid,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: `USER_${order.customerPhone || 'GUEST'}`,
      amount: order.totalAmount * 100, // Amount in paise
      redirectUrl: `${process.env.FRONTEND_URL}/order-tracker/${order._id}`,
      redirectMode: 'REDIRECT',
      callbackUrl: paymentConfig.phonepe.callbackUrl,
      mobileNumber: order.customerPhone,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    const endpoint = '/pg/v1/pay';
    const checksum = generatePhonePeChecksum(payload, endpoint, mkey, mindex);

    const options = {
      method: 'POST',
      url: paymentConfig.phonepe.env === 'PRODUCTION' 
        ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-VERIFY': checksum
      },
      data: {
        request: Buffer.from(JSON.stringify(payload)).toString('base64')
      }
    };

    const response = await axios.request(options);
    
    // Send back the payment URL to the frontend
    res.json({
      success: true,
      paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
      transactionId: merchantTransactionId
    });

  } catch (error) {
    console.error('PhonePe Initiation Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to initiate PhonePe payment' });
  }
});

// 2. PHONEPE CALLBACK (Webhook)
router.post('/phonepe/callback', async (req, res) => {
  try {
    // PhonePe sends post-parameter 'response' which is base64 encoded
    const base64Response = req.body.response;
    const decodedResponse = JSON.parse(Buffer.from(base64Response, 'base64').toString('utf-8'));
    
    const merchantTransactionId = decodedResponse.data.merchantTransactionId;
    const order = await Order.findOne({ transactionId: merchantTransactionId }).populate({
      path: 'store',
      populate: { path: 'admin' }
    });

    if (!order) return res.status(404).send('Order not found');

    // SECURITY: We should verify the checksum here too, 
    // but PhonePe callbacks are signed with the same salt key used for initiation.
    // If you have multiple vendors, you MUST verify with the specific vendor's salt key.
    const vendor = order.store.admin;
    const mkey = vendor.phonepeSaltKey || paymentConfig.phonepe.saltKey;
    const mindex = vendor.phonepeSaltIndex || paymentConfig.phonepe.saltIndex;

    // SECURITY: Verify X-Verify header from PhonePe
    const xVerify = req.headers['x-verify'];
    const calculatedChecksum = crypto.createHash('sha256')
      .update(base64Response + mkey)
      .digest('hex') + "###" + mindex;

    if (xVerify !== calculatedChecksum) {
      console.warn('PhonePe Callback Security: Checksum mismatch!');
      return res.status(401).send('Unauthorized');
    }
    
    if (decodedResponse.success && decodedResponse.code === 'PAYMENT_SUCCESS') {
      if (order.paymentStatus !== 'Confirmed') {
        order.paymentStatus = 'Confirmed';
        order.status = 'Pending'; // Change from 'Payment Pending' to 'Pending' (visible to vendor)
        await order.save();

        // 🔔 NOTIFY VENDOR
        const io = req.app.get('io');
        io.to(order.store._id.toString()).emit('new_order', order);

        // 🔔 PUSH NOTIFICATION (OneSignal)
        if (order.store && order.store.admin) {
          const notificationData = {
            title: '💰 New Paid Order!',
            body: `Order #${order.orderNumber} - ₹${order.totalAmount} (Paid via PhonePe)`,
            orderId: order._id,
            type: 'new_order',
            clickAction: `/vendor/dashboard`
          };
          await notificationService.sendToUser(order.store.admin._id || order.store.admin, notificationData);
        }
        
        console.log(`Order #${order.orderNumber} successfully paid via PhonePe.`);
      }
    }

    // Always 200 to acknowledge webhook
    res.status(200).send('OK');
  } catch (error) {
    console.error('PhonePe Callback Error:', error);
    res.status(500).send('Error');
  }
});

const PaytmChecksum = require('paytmchecksum');

// ... (previous PhonePe logic)

// 3. INITIATE PAYTM PAYMENT
router.post('/paytm/initiate', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate({
      path: 'store',
      populate: { path: 'admin' }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const vendor = order.store?.admin;
    if (!vendor) {
      return res.status(400).json({ message: 'Store admin information missing' });
    }

    const mid = (vendor.paytmMerchantId || paymentConfig.paytm.merchantId || '').toString().trim();
    const mkey = (vendor.paytmMerchantKey || paymentConfig.paytm.merchantKey || '').toString().trim();
    const env = vendor.paytmEnv || paymentConfig.paytm.env || 'STAGING';
    
    if (!mid || mid === 'YOUR_MID') {
      return res.status(400).json({ message: 'Paytm Merchant ID not configured for this store' });
    }
    if (!mkey || mkey === 'YOUR_KEY') {
      return res.status(400).json({ message: 'Paytm Merchant Key not configured for this store' });
    }

    // Website name logic: Staging usually needs WEBSTAGING, Production needs DEFAULT (unless custom)
    let website = (vendor.paytmWebsite || paymentConfig.paytm.website || 'DEFAULT').toString().trim();
    if (env === 'STAGING' && website === 'DEFAULT') {
      website = 'WEBSTAGING';
    }

    // Clean up callback URL (remove double slashes)
    const backendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
    const callbackUrl = `${backendUrl}/api/payments/paytm/callback`;

    // Validation: Paytm Merchant Keys are strictly 16 characters
    if (mkey.length !== 16) {
      console.warn(`Paytm Critical: Vendor ${vendor.email} has a Merchant Key of ${mkey.length} characters. IT MUST BE EXACTLY 16.`);
    }

    const orderNumber = `PT${order.orderNumber}${Date.now()}`.substring(0, 45); 
    
    order.transactionId = orderNumber;
    order.paymentProvider = 'Paytm';
    await order.save();

    const paytmParamsBody = {
      requestType: "Payment",
      mid: mid,
      websiteName: website,
      orderId: orderNumber,
      callbackUrl: callbackUrl,
      txnAmount: {
        value: order.totalAmount.toFixed(2),
        currency: "INR",
      },
      userInfo: {
        custId: `CUST${order.customerPhone || 'GUEST'}`.substring(0, 30),
      },
    };

    // Ensure strict minified JSON for checksum to avoid 'System Error (501)'
    const bodyString = JSON.stringify(paytmParamsBody);
    const checksum = await PaytmChecksum.generateSignature(bodyString, mkey);

    const paytmParams = {
      body: paytmParamsBody,
      head: {
        signature: checksum,
      },
    };

    const isProduction = env === 'PRODUCTION';
    const url = isProduction
      ? `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderNumber}`
      : `https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderNumber}`;

    console.log('--- PAYTM DEBUG INFO ---');
    console.log('ENV:', env, '| WEBSITE:', website);
    console.log('MID:', mid, `(Len: ${mid.length})`);
    console.log('MKEY:', '****', `(Len: ${mkey.length})`);
    console.log('CALLBACK:', callbackUrl);
    console.log('---');

    console.log('--- PAYTM INITIATE REQUEST ---');
    console.log('URL:', url);
    console.log('Body:', JSON.stringify(paytmParams.body));
    console.log('Checksum:', checksum);

    const response = await axios.post(url, paytmParams, {
      headers: { "Content-Type": "application/json" },
    }).catch(err => {
      console.error('Paytm API Request Failed:', err.response?.data || err.message);
      throw err;
    });

    console.log('--- PAYTM API RESPONSE ---');
    console.log(JSON.stringify(response.data));

    if (response.data.body && response.data.body.resultInfo.resultStatus === 'S') {
      const txnToken = response.data.body.txnToken;
      const paymentUrl = isProduction
        ? `https://securegw.paytm.in/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${orderNumber}&txnToken=${txnToken}`
        : `https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${orderNumber}&txnToken=${txnToken}`;

      res.json({
        success: true,
        paymentUrl: paymentUrl,
        transactionId: orderNumber
      });
    } else {
      const resultInfo = response.data.body?.resultInfo || {};
      res.status(400).json({ 
        success: false,
        message: `${resultInfo.resultMsg || 'System Error'} (${resultInfo.resultCode || 'N/A'})`
      });
    }

  } catch (error) {
    console.error('Paytm Initiation Error:', error);
    res.status(500).json({ message: 'Failed to initiate Paytm payment' });
  }
});

// 4. PAYTM CALLBACK (Webhook)
router.post('/paytm/callback', async (req, res) => {
  try {
    const paytmParams = req.body;
    
    const order = await Order.findOne({ transactionId: paytmParams.ORDERID }).populate({
      path: 'store',
      populate: { path: 'admin' }
    });

    if (!order) {
      console.error('Paytm Callback Error: Order not found for transactionId', paytmParams.ORDERID);
      return res.redirect(`${process.env.FRONTEND_URL}/`); // Redirect to home or error page
    }

    const vendor = order.store.admin;
    const mkey = vendor.paytmMerchantKey || paymentConfig.paytm.merchantKey;

    const checksum = paytmParams.CHECKSUMHASH;
    delete paytmParams.CHECKSUMHASH;

    const isVerifySignature = PaytmChecksum.verifySignature(
      paytmParams,
      mkey,
      checksum
    );

    if (isVerifySignature && paytmParams.STATUS === 'TXN_SUCCESS') {
      if (order && order.paymentStatus !== 'Confirmed') {
        order.paymentStatus = 'Confirmed';
        order.status = 'Pending';
        await order.save();

        // 🔔 NOTIFY VENDOR
        const io = req.app.get('io');
        io.to(order.store._id.toString()).emit('new_order', order);

        // 🔔 PUSH NOTIFICATION (OneSignal)
        if (order.store && order.store.admin) {
          const notificationData = {
            title: '💰 New Paid Order!',
            body: `Order #${order.orderNumber} - ₹${order.totalAmount} (Paid via Paytm)`,
            orderId: order._id,
            type: 'new_order',
            clickAction: `/vendor/dashboard`
          };
          await notificationService.sendToUser(order.store.admin._id || order.store.admin, notificationData);
        }
      }
    }

    // Redirect user back to the status page or tracker
    if (order) {
      res.redirect(`${process.env.FRONTEND_URL}/order-tracker/${order._id}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/`);
    }

  } catch (error) {
    console.error('Paytm Callback Error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
