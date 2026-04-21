require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../models/Store');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const currentHHMM = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
  
  console.log('--- ALL STALLS VERIFICATION ---');
  console.log('IST Time:', currentHHMM);
  console.log('-------------------------------\n');

  // Matching updated server logic
  const automatedStores = await Store.find({ isAutomated: { $ne: false } });
  console.log(`Found ${automatedStores.length} stores to be automated.`);

  for (const store of automatedStores) {
    const shouldBeOpen = currentHHMM >= store.openingTime && currentHHMM < store.closingTime;
    console.log(`- ${store.name}: isAutomated=${store.isAutomated}, open="${store.openingTime}", close="${store.closingTime}", isOpen=${store.isOpen}, shouldBeOpen=${shouldBeOpen}`);
  }

  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
