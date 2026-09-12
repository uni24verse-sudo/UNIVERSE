const fs = require('fs');

const rawOrders = JSON.parse(fs.readFileSync('./backend/backup/raw/orders.json', 'utf8'));
const rawStores = JSON.parse(fs.readFileSync('./backend/backup/raw/stores.json', 'utf8'));

const hhhStoreId = '69d2abde1f40bd3800fe4e64';
function getId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val['$oid']) return val['$oid'];
  return val.toString();
}

const nonHhhOrders = rawOrders.filter(o => getId(o.store) !== hhhStoreId);

console.log('=== RAW ORDERS ORIGINAL DATES & STORES ===');
nonHhhOrders.forEach(o => {
  const storeId = getId(o.store);
  const store = rawStores.find(s => getId(s._id) === storeId);
  const orderDate = new Date(o.createdAt['$date'] || o.createdAt);
  const trialStart = store?.trialStartDate ? new Date(store.trialStartDate['$date'] || store.trialStartDate) : null;
  const trialEnd = store?.trialEndDate ? new Date(store.trialEndDate['$date'] || store.trialEndDate) : null;
  const isAfterTrial = trialEnd ? orderDate > trialEnd : false;

  console.log(`Order #${o.orderNumber}: amt=₹${o.totalAmount}, status=${o.status}, date=${orderDate.toISOString().slice(0,10)}, store="${store?.name}" | Trial: [${trialStart?.toISOString().slice(0,10)} to ${trialEnd?.toISOString().slice(0,10)}] | AfterTrial: ${isAfterTrial}`);
});
