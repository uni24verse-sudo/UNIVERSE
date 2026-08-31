require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../backend/models/Store');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const nowIST = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const currentHHMM = nowIST.getHours().toString().padStart(2, '0') + ':' + nowIST.getMinutes().toString().padStart(2, '0');
  
  console.log('--- Current Server Context ---');
  console.log('Raw Now:', new Date().toISOString());
  console.log('nowIST String:', new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  console.log('nowIST object:', nowIST.toString());
  console.log('currentHHMM:', currentHHMM);
  console.log('------------------------------\n');

  const stores = await Store.find({ isAutomated: true });
  console.log(`Found ${stores.length} automated stores.`);

  for (const store of stores) {
    const shouldBeOpen = currentHHMM >= store.openingTime && currentHHMM < store.closingTime;
    console.log(`- ${store.name}:`);
    console.log(`  isAutomated: ${store.isAutomated}`);
    console.log(`  openingTime: "${store.openingTime}"`);
    console.log(`  closingTime: "${store.closingTime}"`);
    console.log(`  isOpen (current): ${store.isOpen}`);
    console.log(`  Calculated shouldBeOpen: ${shouldBeOpen}`);
    if (store.isOpen !== shouldBeOpen) {
      console.log(`  !!! MISMATCH DETECTED !!!`);
    }
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
