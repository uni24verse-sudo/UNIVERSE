const fs = require('fs');

const orders = JSON.parse(fs.readFileSync('./backend/backup/raw/orders.json', 'utf8'));
const refunds = JSON.parse(fs.readFileSync('./backend/backup/raw/refunds.json', 'utf8'));

const hhhStoreId = '69d2abde1f40bd3800fe4e64';
function getId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val['$oid']) return val['$oid'];
  return val.toString();
}

const hhhOrders = orders.filter(o => getId(o.store) === hhhStoreId);
const nonHhhOrders = orders.filter(o => getId(o.store) !== hhhStoreId);

console.log('=== ORDER COUNTS ===');
console.log('Total orders in raw backup:', orders.length);
console.log('Hhh orders:', hhhOrders.length);
console.log('Non-Hhh orders:', nonHhhOrders.length);

console.log('\n=== REVENUE & GMV BREAKDOWN ===');
const allCompleted = orders.filter(o => o.status === 'Completed');
const nonHhhCompleted = nonHhhOrders.filter(o => o.status === 'Completed');
const hhhCompleted = hhhOrders.filter(o => o.status === 'Completed');

console.log('1. All 85 Orders - Completed GMV:', allCompleted.reduce((s, o) => s + (o.totalAmount || 0), 0));
console.log('   All 85 Orders - All statuses sum:', orders.reduce((s, o) => s + (o.totalAmount || 0), 0));

console.log('2. Hhh 44 Orders - Completed GMV:', hhhCompleted.reduce((s, o) => s + (o.totalAmount || 0), 0));
console.log('   Hhh 44 Orders - All statuses sum:', hhhOrders.reduce((s, o) => s + (o.totalAmount || 0), 0));

console.log('3. Non-Hhh 41 Orders - Completed GMV:', nonHhhCompleted.reduce((s, o) => s + (o.totalAmount || 0), 0));
console.log('   Non-Hhh 41 Orders - All statuses sum:', nonHhhOrders.reduce((s, o) => s + (o.totalAmount || 0), 0));

console.log('\n=== HHH ORDERS DETAIL ===');
console.log('Completed Hhh orders count:', hhhCompleted.length);
console.log('Completed Hhh orders amounts:');
hhhCompleted.forEach(o => console.log(`Order #${o.orderNumber || o._id}: ₹${o.totalAmount}`));

console.log('\nCancelled Hhh orders count:', hhhOrders.filter(o => o.status === 'Cancelled').length);
console.log('Cancelled Hhh orders:');
hhhOrders.filter(o => o.status === 'Cancelled').forEach(o => console.log(`Order #${o.orderNumber || o._id}: amt=₹${o.totalAmount}, refundAmt=₹${o.refundAmount}, refundStatus=${o.refundStatus}`));

console.log('\n=== REFUNDS COLLECTION IN RAW BACKUP ===');
console.log('Total refunds in raw backup:', refunds.length);
refunds.forEach(r => {
  console.log(JSON.stringify(r, null, 2));
});
