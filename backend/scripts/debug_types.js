require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../models/Store');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const stores = await Store.find({}).lean();
  console.log(`Total stores: ${stores.length}`);
  stores.forEach(s => {
    console.log(`- ${s.name}: isAutomated=${s.isAutomated} (Type: ${typeof s.isAutomated}), isOpen=${s.isOpen}`);
  });
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
