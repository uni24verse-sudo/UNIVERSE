const fs = require('fs');

const customers = JSON.parse(fs.readFileSync('./backend/backup/raw/customers.json', 'utf8'));
const orders = JSON.parse(fs.readFileSync('./backend/backup/raw/orders.json', 'utf8'));
const payments = JSON.parse(fs.readFileSync('./backend/backup/raw/payments.json', 'utf8'));

console.log('=== FINDING THE ₹983 REFUND SOURCE ===');

// Check customers
let sumCustRefunds = 0;
customers.forEach(c => {
  const ref = c.metrics?.totalRefunded || 0;
  if (ref > 0) {
    console.log(`Customer ${c.phone} (${c.name || c.currentName}): metrics.totalRefunded = ₹${ref}`);
    sumCustRefunds += ref;
  }
});
console.log('Sum of totalRefunded in raw customers:', sumCustRefunds);

// Check payments
console.log('\n=== PAYMENTS WITH REFUNDS ===');
let sumPaymentRefunds = 0;
payments.forEach(p => {
  if (p.refundStatus && p.refundStatus !== 'NONE' && p.refundStatus !== 'None') {
    console.log(`Payment ${p._id}: amt=₹${p.amount}, refundAmt=₹${p.refundAmount || 0}, refundStatus=${p.refundStatus}, orderId=${p.orderId || p.order}`);
    sumPaymentRefunds += (p.refundAmount || 0);
  }
});
console.log('Sum of payment refundAmount:', sumPaymentRefunds);

// Check orders
console.log('\n=== ORDERS WITH CANCELLED STATUS OR REFUND AMOUNTS ===');
let sumOrderRefunds = 0;
orders.forEach(o => {
  if (o.refundAmount > 0 || (o.status === 'Cancelled' && o.paymentStatus === 'Confirmed')) {
    console.log(`Order #${o.orderNumber || o._id}: amt=₹${o.totalAmount}, refundAmt=₹${o.refundAmount || 0}, status=${o.status}, paymentStatus=${o.paymentStatus}, store=${o.store?.$oid || o.store}`);
    sumOrderRefunds += (o.refundAmount || o.totalAmount || 0);
  }
});
console.log('Sum of order refund amounts:', sumOrderRefunds);
