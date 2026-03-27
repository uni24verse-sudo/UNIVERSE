const notificationService = require('./services/notificationService');
const mongoose = require('mongoose');

// Test order data
const testOrder = {
  _id: '507f1f77bcf86cd799439011',
  orderNumber: '1234',
  totalAmount: 299,
  paymentMethod: 'UPI',
  status: 'Payment Pending'
};

// Test vendor ID (replace with actual vendor ID from your database)
const testVendorId = '507f1f77bcf86cd799439012';

async function testNotifications() {
  console.log('🧪 Testing OneSignal Notifications...\n');
  
  try {
    // Test 1: New Order Notification
    console.log('1. Testing New Order Notification...');
    const result1 = await notificationService.sendNewOrderNotification(testVendorId, testOrder);
    console.log('Result:', result1.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!result1.success) console.log('Error:', result1.error);
    console.log('---\n');
    
    // Test 2: Payment Verification Request
    console.log('2. Testing Payment Verification Request...');
    const verificationData = {
      title: '🔔 Payment Verification Requested!',
      body: `Customer requested verification for Order #${testOrder.orderNumber} - ₹${testOrder.totalAmount}`,
      orderId: testOrder._id,
      type: 'payment_verification',
      clickAction: '/vendor/dashboard'
    };
    const result2 = await notificationService.sendToUser(testVendorId, verificationData);
    console.log('Result:', result2.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!result2.success) console.log('Error:', result2.error);
    console.log('---\n');
    
    // Test 3: UPI Payment Confirmation
    console.log('3. Testing UPI Payment Confirmation...');
    const paymentData = {
      title: '💰 UPI Payment Confirmed!',
      body: `Order #${testOrder.orderNumber} - ₹${testOrder.totalAmount} (UPI payment verified)`,
      orderId: testOrder._id,
      type: 'new_order',
      clickAction: '/vendor/dashboard'
    };
    const result3 = await notificationService.sendToUser(testVendorId, paymentData);
    console.log('Result:', result3.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!result3.success) console.log('Error:', result3.error);
    console.log('---\n');
    
    // Test 4: PhonePe Payment Notification
    console.log('4. Testing PhonePe Payment Notification...');
    const phonepeData = {
      title: '💰 New Paid Order!',
      body: `Order #${testOrder.orderNumber} - ₹${testOrder.totalAmount} (Paid via PhonePe)`,
      orderId: testOrder._id,
      type: 'new_order',
      clickAction: '/vendor/dashboard'
    };
    const result4 = await notificationService.sendToUser(testVendorId, phonepeData);
    console.log('Result:', result4.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!result4.success) console.log('Error:', result4.error);
    console.log('---\n');
    
    // Test 5: Paytm Payment Notification
    console.log('5. Testing Paytm Payment Notification...');
    const paytmData = {
      title: '💰 New Paid Order!',
      body: `Order #${testOrder.orderNumber} - ₹${testOrder.totalAmount} (Paid via Paytm)`,
      orderId: testOrder._id,
      type: 'new_order',
      clickAction: '/vendor/dashboard'
    };
    const result5 = await notificationService.sendToUser(testVendorId, paytmData);
    console.log('Result:', result5.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!result5.success) console.log('Error:', result5.error);
    console.log('---\n');
    
    console.log('🎉 Notification testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check environment variables
console.log('🔧 Checking OneSignal Configuration...');
console.log('App ID:', process.env.ONESIGNAL_APP_ID ? '✅ Set' : '❌ Missing');
console.log('API Key:', process.env.ONESIGNAL_REST_API_KEY ? '✅ Set' : '❌ Missing');
console.log('---\n');

// Run tests
testNotifications().then(() => {
  console.log('\n📋 Test Summary:');
  console.log('- Make sure vendor is logged into the frontend app');
  console.log('- Check browser notification permissions');
  console.log('- Verify OneSignal SDK is initialized');
  console.log('- Check vendor external ID matches database ID');
  process.exit(0);
}).catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
