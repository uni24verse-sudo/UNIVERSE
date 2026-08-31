require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../models/Store');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const stores = await Store.find({});
  console.log(`Found ${stores.length} stores in total.`);

  for (const store of stores) {
    console.log(`- ${store.name}: isAutomated=${store.isAutomated}, open="${store.openingTime}", close="${store.closingTime}", isOpen=${store.isOpen}`);
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
