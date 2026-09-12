const fs = require('fs');

const rawSettlements = JSON.parse(fs.readFileSync('./backend/backup/raw/settlements.json', 'utf8'));
const hhhStoreId = '69d2abde1f40bd3800fe4e64';
function getId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val['$oid']) return val['$oid'];
  return val.toString();
}

console.log('=== SETTLEMENTS BREAKDOWN ===');
rawSettlements.forEach(s => {
  const isHhh = getId(s.store) === hhhStoreId;
  console.log(`Settlement ${s.settlementId}: Store=${getId(s.store)} (isHhh: ${isHhh}) | Rev=₹${s.totalRevenue} | Net=₹${s.netPayable} | Fees:`, s.feesBreakdown);
});
