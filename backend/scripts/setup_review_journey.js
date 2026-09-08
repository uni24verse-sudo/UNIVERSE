const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

const Journey = require('../models/Journey');
const MasterTemplate = require('../models/MasterTemplate');
const ChannelAccount = require('../models/ChannelAccount');

async function inspectAndFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const slot1 = await ChannelAccount.findOne({ slotIndex: 1 });
    const orderTemplate = await MasterTemplate.findOne({ name: /Order/i, channel: 'whatsapp' });

    console.log('Slot 1 ID:', slot1?._id);
    console.log('Order Template ID:', orderTemplate?._id, orderTemplate?.name);

    // Update Welcome Journey triggerType from 'User Registered' to 'First Lifetime Order'
    await Journey.updateMany(
      { triggerType: 'User Registered' },
      { $set: { triggerType: 'First Lifetime Order' } }
    );

    const reviewJourney = await Journey.findOne({ name: /Post-Order Review/i });
    if (reviewJourney) {
      console.log('\n--- Current Post-Order Review Journey Nodes ---');
      console.log(JSON.stringify(reviewJourney.nodes, null, 2));

      // Ensure Delay is 30 mins and Channel Account is Slot 1
      reviewJourney.nodes = [
        {
          id: 'node_1',
          type: 'trigger',
          label: 'Order Marked Completed / Picked Up',
          nextNodeId: 'node_2',
          config: {}
        },
        {
          id: 'node_2',
          type: 'delay',
          label: 'Wait 30 Minutes Post-Meal',
          nextNodeId: 'node_3',
          config: { delayHours: 0, delayMinutes: 30 }
        },
        {
          id: 'node_3',
          type: 'action',
          label: 'Send WhatsApp Feedback & Rating Request',
          nextNodeId: null,
          config: {
            channel: 'whatsapp',
            channelAccountId: slot1 ? slot1._id : null,
            masterTemplateId: orderTemplate ? orderTemplate._id : null
          }
        }
      ];
      reviewJourney.status = 'Active';
      await reviewJourney.save();
      console.log('\nUpdated Post-Order Review Journey in Atlas successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspectAndFix();
