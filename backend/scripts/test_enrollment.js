const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

const journeyEngineService = require('../services/journeyEngineService');
const UserJourneyState = require('../models/UserJourneyState');
const Journey = require('../models/Journey');

async function testTrigger() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    // Simulate an Order Completed event
    console.log('Simulating Order Completed event trigger...');
    await journeyEngineService.triggerEvent('Order Completed', {
      userId: '7985397373',
      name: 'Parth Sharma',
      phone: '7985397373',
      metadata: {
        orderId: 'UV-9999',
        orderNumber: '9999',
        storeName: 'Nescafe Campus',
        amount: 149
      }
    });

    const pendingState = await UserJourneyState.findOne({
      phone: '7985397373',
      status: 'Pending'
    }).sort({ createdAt: -1 }).populate('journeyId');

    if (pendingState) {
      console.log('\n✅ User Successfully Enrolled in 30-Minute Drip Journey!');
      console.log(`- Journey Name: ${pendingState.journeyId?.name}`);
      console.log(`- Recipient: ${pendingState.name} (${pendingState.phone})`);
      console.log(`- Current Node: ${pendingState.currentNodeId}`);
      console.log(`- Scheduled Execution: ${pendingState.scheduledExecutionTime}`);
      console.log(`- Metadata:`, pendingState.metadata);
      
      const diffMins = Math.round((pendingState.scheduledExecutionTime - Date.now()) / (60 * 1000));
      console.log(`- Delay until WhatsApp send: ${diffMins} minutes`);
    } else {
      console.log('No pending state found.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

testTrigger();
