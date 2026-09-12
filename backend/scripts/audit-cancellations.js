const fs = require('fs');

const rawOrders = JSON.parse(fs.readFileSync('./backend/backup/raw/orders.json', 'utf8'));
const rawStores = JSON.parse(fs.readFileSync('./backend/backup/raw/stores.json', 'utf8'));

function getId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val['$oid']) return val['$oid'];
  return val.toString();
}

const hhhStoreId = '69d2abde1f40bd3800fe4e64';
const cancelledOrders = rawOrders.filter(o => 
  getId(o.store) !== hhhStoreId && 
  o.status === 'Cancelled' && 
  o.paymentStatus === 'Confirmed'
);

console.log('=== ALL 9 CANCELLED ORDERS ===');
let realSum = 0;
let parthSum = 0;

cancelledOrders.forEach(o => {
  const isParth = o.customerPhone === '7985397373' || (o.customerName && o.customerName.toLowerCase().includes('parth'));
  if (isParth) {
    parthSum += o.totalAmount;
  } else {
    realSum += o.totalAmount;
  }
  const store = rawStores.find(s => getId(s._id) === getId(o.store));
  console.log(`Order #${o.orderNumber}: ₹${o.totalAmount} | Cust: ${o.customerName} (${o.customerPhone}) | Store: "${store?.name}" | isParthTest: ${isParth}`);
});

console.log(`\nReal Student Cancellations Sum: ₹${realSum}`);
console.log(`Parth Test Cancellations Sum: ₹${parthSum}`);
console.log(`Total Cancellations: ₹${realSum + parthSum}`);
console.log(`4% on Real Student Cancellations (₹${realSum}): ₹${(realSum * 0.04).toFixed(2)}`);
console.log(`4% on All Cancellations (₹${realSum + parthSum}): ₹${((realSum + parthSum) * 0.04).toFixed(2)}`);
