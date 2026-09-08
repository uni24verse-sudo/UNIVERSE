const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

const Journey = require('../models/Journey');
const MasterTemplate = require('../models/MasterTemplate');
const ChannelAccount = require('../models/ChannelAccount');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    const templates = await MasterTemplate.find();
    console.log(`Found ${templates.length} Master Templates in Atlas:`);
    templates.forEach(t => console.log(`- [${t._id}] "${t.name}" (Type: ${t.type}, Channel: ${t.channel})`));

    const accounts = await ChannelAccount.find();
    console.log(`\nFound ${accounts.length} Channel Accounts:`);
    accounts.forEach(a => console.log(`- [${a._id}] Slot ${a.slotIndex}: ${a.name} (${a.channel})`));

    const journeys = await Journey.find();
    console.log(`\nFound ${journeys.length} Journeys in Atlas:`);
    journeys.forEach(j => {
      console.log(`- [${j._id}] "${j.name}" (Trigger: ${j.triggerType}, Status: ${j.status}, Nodes: ${j.nodes?.length})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
