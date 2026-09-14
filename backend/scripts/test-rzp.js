require('dotenv').config();
const Razorpay = require('razorpay');

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function test() {
  console.log('Testing Razorpay with Key ID:', process.env.RAZORPAY_KEY_ID);
  const order = await rzp.orders.create({
    amount: 1000,
    currency: 'INR',
    receipt: 'test_receipt_101'
  });
  console.log('✅ RAZORPAY TEST ORDER CREATED SUCCESSFULLY!');
  console.log('Order ID:', order.id);
  console.log('Amount:', order.amount / 100, 'INR');
  console.log('Status:', order.status);
}

test().catch(err => console.error('❌ Razorpay Error:', err));
