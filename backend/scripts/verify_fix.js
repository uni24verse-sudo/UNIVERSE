require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../models/Store');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Robust HH:mm calculation for IST (Matched New Logic)
  const currentHHMM = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
  
  console.log('--- Verification Context ---');
  console.log('Raw Now (UTC):', new Date().toISOString());
  console.log('currentHHMM (Robust IST):', currentHHMM);
  console.log('----------------------------\n');

  const stores = await Store.find({ isAutomated: true });
  console.log(`Found ${stores.length} automated stores.`);

  for (const store of stores) {
    const shouldBeOpen = currentHHMM >= store.openingTime && currentHHMM < store.closingTime;
    console.log(`- ${store.name}: isAutomated=${store.isAutomated}, open="${store.openingTime}", close="${store.closingTime}", isOpen=${store.isOpen}, calculatedShouldBeOpen=${shouldBeOpen}`);
    
    if (store.isOpen !== shouldBeOpen) {
       console.log(`  [!] Action Required: Status should be ${shouldBeOpen ? 'OPEN' : 'CLOSED'}`);
    }
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
