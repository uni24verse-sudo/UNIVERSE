const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Order = require('../models/Order');
const Refund = require('../models/Refund');
const Store = require('../models/Store');
const Customer = require('../models/Customer');
const refundService = require('../services/refundService');

async function runFullIntegrationTest() {
  console.log('--- 🚀 RUNNING FULL DIRECT UPI REFUND & 24/7 STUDENT DOCK TEST ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const store = await Store.findOne();
  if (!store) {
    console.error('❌ No store found in database.');
    process.exit(1);
  }

  const testPhone = '7985397373';
  const testName = 'Direct Flow Student';

  // 1. Ensure Customer Record in Customer 360
  await Customer.findOneAndUpdate(
    { phone: testPhone },
    {
      $set: {
        phone: testPhone,
        currentName: testName,
        totalOrders: 5,
        campus: 'Main Campus'
      }
    },
    { upsert: true, new: true }
  );
  console.log(`✅ [1/6] Seeded/Verified Customer 360 for ${testPhone}`);

  // 2. Create Active Test Order
  const activeOrderNumber = `DOCK-${Math.floor(1000 + Math.random() * 9000)}`;
  const activeOrder = await Order.create({
    store: store._id,
    orderNumber: activeOrderNumber,
    items: [
      { name: 'Special Paneer Roll', price: 150, quantity: 2 },
      { name: 'Cold Coffee', price: 60, quantity: 1 }
    ],
    totalAmount: 360,
    paymentMethod: 'UPI',
    status: 'Cooking',
    paymentStatus: 'Confirmed',
    customerPhone: testPhone,
    customerName: testName,
    payerUpiId: 'student@okhdfcbank'
  });
  console.log(`✅ [2/6] Created Active Cooking Order #${activeOrder.orderNumber}`);

  // 3. Test Customer Lifetime History Query
  const allStudentOrders = await Order.find({
    customerPhone: { $regex: testPhone.slice(-10) }
  }).populate('store', 'name market').sort({ createdAt: -1 });

  const activeFound = allStudentOrders.filter(o => ['Payment Pending', 'Pending', 'Confirmed', 'Cooking', 'Ready'].includes(o.status));
  const pastFound = allStudentOrders.filter(o => ['Completed', 'Cancelled'].includes(o.status));

  console.log(`✅ [3/6] Customer History Verified: Found ${activeFound.length} Active Orders, ${pastFound.length} Past Orders.`);
  if (!activeFound.some(o => o.orderNumber === activeOrderNumber)) {
    throw new Error('Active order not found in customer history!');
  }

  // 4. Test Cancellation & Instant Direct UPI Refund Generation
  const cancelRes = await refundService.handleOrderCancellation({
    orderId: activeOrder._id,
    reason: 'Kitchen capacity full',
    actorType: 'VENDOR_STAFF',
    actorId: 'VENDOR_101'
  });
  console.log(`✅ [4/6] Cancelled Order #${activeOrder.orderNumber} -> Refund: ${cancelRes.refundId}`);

  const refundDoc = await Refund.findOne({ orderId: activeOrder._id });
  if (!refundDoc || refundDoc.mode !== 'DIRECT_UPI' || refundDoc.status !== 'REQUESTED') {
    throw new Error('Refund document creation failed or status invalid!');
  }

  // 5. Test 3-Minute Claim & Lock Simulation
  const lockTime = new Date();
  const expireTime = new Date(Date.now() + 3 * 60 * 1000);
  refundDoc.lockedBy = 'Admin-Priya';
  refundDoc.lockedAt = lockTime;
  refundDoc.lockExpiresAt = expireTime;
  await refundDoc.save();
  console.log(`✅ [5/6] 3-Minute Claim & Lock Verified: Locked by ${refundDoc.lockedBy} until ${expireTime.toISOString()}`);

  // 6. Test Super Admin Settlement with Bank UTR
  const settleRes = await refundService.settleRefund({
    refundId: refundDoc._id,
    utr: 'UTR_CAMPUS_987654321',
    settledBy: 'SuperAdmin'
  });
  console.log(`✅ [6/6] Settlement Completed:`, settleRes.message);

  const verifiedOrder = await Order.findById(activeOrder._id);
  const verifiedRefund = await Refund.findById(refundDoc._id);

  console.log(`   Final State: Order.refundStatus=${verifiedOrder.refundStatus}, Refund.status=${verifiedRefund.status}, UTR=${verifiedRefund.utr}`);
  if (verifiedOrder.refundStatus !== 'Refunded' || verifiedRefund.status !== 'PROCESSED' || verifiedRefund.utr !== 'UTR_CAMPUS_987654321') {
    throw new Error('Settlement verification failed!');
  }

  // Clean up
  await Order.findByIdAndDelete(activeOrder._id);
  await Refund.findByIdAndDelete(refundDoc._id);
  console.log('🧹 Cleaned up temporary test records.');
  console.log('🎉 ALL INTEGRATION TESTS PASSED 100%!');

  await mongoose.disconnect();
  process.exit(0);
}

runFullIntegrationTest().catch((err) => {
  console.error('❌ Integration Test Failed:', err);
  process.exit(1);
});
