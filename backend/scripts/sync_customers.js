const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Order = require('../models/Order');
const Store = require('../models/Store');
const Location = require('../models/Location');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const crypto = require('crypto');

async function syncAllCustomers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    const orders = await Order.find().sort({ createdAt: 1 }).populate({
      path: 'store',
      populate: { path: 'locationId' }
    });
    console.log(`Found ${orders.length} total orders to process.`);

    const phoneCustomerMap = new Map();

    for (const order of orders) {
      const rawPhone = order.customerPhone || '9999999999';
      const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
      const name = (order.customerName || 'Student').trim();

      if (!phoneCustomerMap.has(cleanPhone)) {
        let existingCust = await Customer.findOne({ phone: cleanPhone });
        if (!existingCust) {
          const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
          const userId = `USR-${randomSuffix}`;
          existingCust = new Customer({
            userId,
            phone: cleanPhone,
            currentName: name,
            email: order.customerEmail || '',
            campus: 'Lovely Professional University',
            firstOrderAt: order.createdAt || new Date(),
            lastOrderAt: order.createdAt || new Date(),
            status: 'Active'
          });
        }
        phoneCustomerMap.set(cleanPhone, existingCust);
      }

      const cust = phoneCustomerMap.get(cleanPhone);
      if (order.createdAt > cust.lastOrderAt) {
        cust.lastOrderAt = order.createdAt;
        cust.currentName = name;
      }
      if (order.customerEmail && !cust.email) {
        cust.email = order.customerEmail;
      }
    }

    console.log(`Aggregating metrics & campuses for ${phoneCustomerMap.size} unique customer phone numbers...`);

    for (const [phone, cust] of phoneCustomerMap.entries()) {
      const userOrders = orders.filter(o => (o.customerPhone || '').replace(/\D/g, '').slice(-10) === phone);
      
      const totalOrders = userOrders.length;
      const completedOrders = userOrders.filter(o => o.status === 'Completed').length;
      const cancelledOrders = userOrders.filter(o => o.status === 'Cancelled' || o.refundStatus === 'Processed').length;
      const totalSpent = userOrders
        .filter(o => o.status === 'Completed')
        .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const totalRefunded = userOrders
        .filter(o => o.status === 'Cancelled' || o.refundStatus === 'Processed')
        .reduce((sum, o) => sum + (Number(o.refundAmount || o.totalAmount) || 0), 0);
      const refundRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      // Determine actual campus & market preference from orders
      const locationCounts = {};
      const marketCounts = {};
      for (const ord of userOrders) {
        const locName = ord.store?.locationId?.name || (ord.store?.locationId?.type === 'College' ? 'Lovely Professional University' : 'Lovely Professional University');
        const marketName = ord.store?.market;
        if (locName) locationCounts[locName] = (locationCounts[locName] || 0) + 1;
        if (marketName) marketCounts[marketName] = (marketCounts[marketName] || 0) + 1;
      }

      const topLoc = Object.keys(locationCounts).sort((a,b) => locationCounts[b] - locationCounts[a])[0] || 'Lovely Professional University';
      const topMarket = Object.keys(marketCounts).sort((a,b) => marketCounts[b] - marketCounts[a])[0];

      cust.campus = topMarket && topMarket !== 'Main Campus' ? `${topLoc} • ${topMarket}` : topLoc;

      cust.metrics = {
        totalOrders,
        completedOrders,
        cancelledOrders,
        vendorRejectedOrders: cancelledOrders,
        totalSpent,
        totalRefunded,
        refundRate: Math.round(refundRate * 10) / 10
      };

      cust.riskSignals = [];
      if (refundRate > 50 && totalOrders > 2) {
        cust.riskSignals.push({
          flagType: 'HIGH_REFUND_RATIO',
          reason: `High cancellation/refund rate of ${Math.round(refundRate)}% across ${totalOrders} orders`,
          detectedAt: new Date()
        });
        cust.status = 'Flagged';
      } else {
        cust.status = 'Active';
      }

      cust.lastActivityAt = cust.lastOrderAt || new Date();
      await cust.save();

      // Backfill order.userId & ensure Payment records exist
      for (const o of userOrders) {
        let orderUpdated = false;
        if (!o.userId || o.userId !== cust.userId) {
          o.userId = cust.userId;
          orderUpdated = true;
        }
        if (orderUpdated) {
          await o.save();
        }

        // Backfill payment record if payment confirmed or completed
        if (o.status === 'Completed' || o.paymentStatus === 'Confirmed' || o.transactionId) {
          const existingPay = await Payment.findOne({ orderId: o._id });
          if (!existingPay) {
            await Payment.create({
              paymentId: o.transactionId || `pay_legacy_${o._id}`,
              orderId: o._id,
              userId: cust.userId,
              amount: o.totalAmount,
              status: 'CAPTURED',
              method: o.paymentMethod || 'Razorpay',
              capturedAt: o.createdAt || new Date()
            });
          }
        }
      }
    }

    const customerCount = await Customer.countDocuments();
    const paymentCount = await Payment.countDocuments();
    console.log(`🎉 BACKFILL COMPLETE!`);
    console.log(`Total Customers Created/Updated: ${customerCount}`);
    console.log(`Total Payments Logged: ${paymentCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill Error:', err);
    process.exit(1);
  }
}

syncAllCustomers();
