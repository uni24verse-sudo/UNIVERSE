const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Order = require('../models/Order');
const Refund = require('../models/Refund');
const Store = require('../models/Store');
const refundService = require('../services/refundService');

async function testDirectRefundFlow() {
  console.log('--- 🧪 STARTING DIRECT UPI REFUND SYSTEM TEST ---');
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Find an existing store to create a mock test order
  const store = await Store.findOne();
  if (!store) {
    console.error('❌ No store found in database.');
    process.exit(1);
  }

  // 2. Create a Mock Test Order
  const testOrderNumber = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const mockOrder = await Order.create({
    store: store._id,
    orderNumber: testOrderNumber,
    items: [{ name: 'Test Paneer Roll', price: 120, quantity: 1 }],
    totalAmount: 120,
    paymentMethod: 'UPI',
    status: 'Pending',
    paymentStatus: 'Confirmed',
    customerPhone: '7985397373',
    customerName: 'Test Student',
    payerUpiId: 'teststudent@oksbi', // Simulating captured VPA
    customerUpiId: 'teststudent@oksbi'
  });
  console.log(`✅ [1/5] Created Test Order #${mockOrder.orderNumber} with payer UPI: ${mockOrder.payerUpiId}`);

  // 3. Test handleOrderCancellation (Vendor Rejection / Timeout)
  const cancelRes = await refundService.handleOrderCancellation({
    orderId: mockOrder._id,
    reason: 'Test cancellation: Item out of stock',
    actorType: 'VENDOR_STAFF',
    actorId: 'TEST_RUNNER'
  });
  console.log('✅ [2/5] Order Cancellation Result:', cancelRes);

  const cancelledOrder = await Order.findById(mockOrder._id);
  console.log(`   Order Status: ${cancelledOrder.status}, Refund Status: ${cancelledOrder.refundStatus}`);

  const refundDoc = await Refund.findOne({ orderId: mockOrder._id });
  console.log(`   Refund Doc Created: ID=${refundDoc.refundId}, Amount=₹${refundDoc.amount}, Mode=${refundDoc.mode}, Status=${refundDoc.status}`);

  if (cancelledOrder.status !== 'Cancelled' || cancelledOrder.refundStatus !== 'Requested' || refundDoc.status !== 'REQUESTED') {
    throw new Error('Order cancellation state mismatch!');
  }

  // 4. Test requestUpiRefund (Student updates UPI to a different ID e.g. 7985397373@paytm)
  const reqUpiRes = await refundService.requestUpiRefund({
    orderId: mockOrder._id,
    upiId: '7985397373@paytm'
  });
  console.log('✅ [3/5] Student UPI Update Result:', reqUpiRes);

  const updatedOrder = await Order.findById(mockOrder._id);
  const updatedRefund = await Refund.findOne({ orderId: mockOrder._id });
  console.log(`   Updated Target UPI: Order=${updatedOrder.customerUpiId}, Refund=${updatedRefund.customerUpiId}`);
  if (updatedOrder.customerUpiId !== '7985397373@paytm' || updatedRefund.customerUpiId !== '7985397373@paytm') {
    throw new Error('UPI update mismatch!');
  }

  // 5. Test settleRefund (Super Admin marks paid with UTR)
  const settleRes = await refundService.settleRefund({
    refundId: updatedRefund._id,
    utr: 'UTR_TEST_99887766',
    settledBy: 'SUPER_ADMIN_TEST'
  });
  console.log('✅ [4/5] Settlement Result:', settleRes.message);

  const settledOrder = await Order.findById(mockOrder._id);
  const settledRefund = await Refund.findById(updatedRefund._id);
  console.log(`   Settled State: Order.refundStatus=${settledOrder.refundStatus}, Refund.status=${settledRefund.status}, UTR=${settledRefund.utr}`);
  if (settledOrder.refundStatus !== 'Refunded' || settledRefund.status !== 'PROCESSED' || settledRefund.utr !== 'UTR_TEST_99887766') {
    throw new Error('Settlement verification failed!');
  }

  // 6. Test updateRefundUtr (Super Admin edits/updates UTR later in history)
  const editUtrRes = await refundService.updateRefundUtr({
    refundId: settledRefund._id,
    utr: 'UTR_EDITED_12345678',
    updatedBy: 'SUPER_ADMIN_TEST'
  });
  console.log('✅ [5/5] Edit UTR Result:', editUtrRes);

  const finalRefund = await Refund.findById(settledRefund._id);
  const finalOrder = await Order.findById(mockOrder._id);
  console.log(`   Final UTR: Refund=${finalRefund.utr}, Order=${finalOrder.refundUtr}`);
  if (finalRefund.utr !== 'UTR_EDITED_12345678' || finalOrder.refundUtr !== 'UTR_EDITED_12345678') {
    throw new Error('UTR edit verification failed!');
  }

  // Clean up mock test order & refund
  await Order.findByIdAndDelete(mockOrder._id);
  await Refund.findByIdAndDelete(settledRefund._id);
  console.log('🧹 Cleaned up mock test records from database.');

  console.log('--- 🎉 ALL DIRECT UPI REFUND SYSTEM TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

testDirectRefundFlow().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
