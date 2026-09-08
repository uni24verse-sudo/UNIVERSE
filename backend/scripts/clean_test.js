const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const UserJourneyState = require('../models/UserJourneyState');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await UserJourneyState.deleteMany({ 'metadata.orderId': 'UV-9999' });
    console.log('Cleaned up test enrollment state.');
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}
cleanup();
