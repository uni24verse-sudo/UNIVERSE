require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Journey = require('../models/Journey');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  // 1. Update Full End-to-End Order Lifecycle Flow
  const journey = await Journey.findOne({ name: 'Full End-to-End Order Lifecycle Flow' });
  if (!journey) {
    console.error('Lifecycle journey not found!');
  } else {
    console.log(`Found journey: ${journey.name} (${journey._id}) with ${journey.nodes.length} nodes.`);

    journey.nodes = journey.nodes.map(node => {
      if (node.id === 'node_msg_placed') {
        node.config = {
          ...node.config,
          customBody:
            `*UNIVERSE: ORDER PLACED* 🛒\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Order: #{{orderNumber}}\n` +
            `Store: {{storeName}}\n` +
            `Amount: {{amount}}\n` +
            `Status: Sent to Kitchen for Confirmation\n\n` +
            `Track your meal & live cooking updates:\n` +
            `{{trackerLink}}\n\n` +
            `Thank you for choosing UniVerse!`,
          btn1Text: '📍 Live Status',
          btn2Text: '💬 Support'
        };
        console.log('Updated node_msg_placed');
      } else if (node.id === 'node_msg_accepted') {
        node.config = {
          ...node.config,
          customBody:
            `*UNIVERSE: ORDER CONFIRMED & COOKING* 🍳\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Order: #{{orderNumber}}\n` +
            `Kitchen: {{storeName}}\n` +
            `Status: Cooking in progress\n\n` +
            `Your meal is being freshly prepared! Watch live kitchen updates:\n` +
            `{{trackerLink}}`,
          btn1Text: '📍 Prep Status',
          btn2Text: '🧾 Digital Bill'
        };
        console.log('Updated node_msg_accepted');
      } else if (node.id === 'node_msg_rejected') {
        node.config = {
          ...node.config,
          customBody:
            `*UNIVERSE: REFUND QUEUED* ⚠️\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Order: #{{orderNumber}}\n` +
            `Store: {{storeName}}\n` +
            `Amount: {{amount}}\n` +
            `Reason: {{reason}}\n\n` +
            `Your refund is queued for instant UPI transfer. Verify your UPI ID on your order tracker:\n` +
            `{{trackerLink}}\n\n` +
            `Our super admin team will send your money directly via UPI shortly.`,
          btn1Text: '⚡ Claim UPI Refund',
          btn2Text: '💬 WhatsApp Support'
        };
        console.log('Updated node_msg_rejected');
      } else if (node.id === 'node_msg_ready') {
        node.config = {
          ...node.config,
          customBody:
            `*UNIVERSE: YOUR FOOD IS READY!* 🔔\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Order: #{{orderNumber}}\n` +
            `Pickup Counter: {{storeName}}\n\n` +
            `Your order is hot and ready for pickup! Show your pickup QR code at the counter:\n` +
            `{{trackerLink}}\n\n` +
            `Enjoy your meal!`,
          btn1Text: '📲 Show Pickup QR',
          btn2Text: '📍 Counter Map'
        };
        console.log('Updated node_msg_ready');
      } else if (node.id === 'node_msg_feedback') {
        node.config = {
          ...node.config,
          customBody:
            `*UNIVERSE: HOW WAS YOUR MEAL?* ⭐\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Order: #{{orderNumber}}\n` +
            `Store: {{storeName}}\n\n` +
            `We hope you enjoyed your food from {{storeName}}! How was your experience today?\n` +
            `{{trackerLink}}\n\n` +
            `Thank you for being a valued UniVerse student!`,
          btn1Text: '⭐ 5 Stars - Loved It!',
          btn2Text: '💬 Share Feedback'
        };
        console.log('Updated node_msg_feedback');
      }
      return node;
    });

    journey.markModified('nodes');
    await journey.save();
    console.log('Successfully updated Full End-to-End Order Lifecycle Flow with bold brand messaging!');
  }

  // 2. Ensure active Journey for Refund Settled exists
  let refundSettledJourney = await Journey.findOne({ triggerType: 'Refund Settled' });
  if (!refundSettledJourney) {
    refundSettledJourney = new Journey({
      name: 'UniVerse Instant Refund Settled Notice',
      description: 'Sends authoritative lock-screen branded WhatsApp notice to student when refund is completed with Bank UTR.',
      triggerType: 'Refund Settled',
      status: 'Active',
      nodes: [
        {
          id: 'node_trigger_refund_settled',
          type: 'trigger',
          label: '1. Refund Settled Trigger',
          nextNodeId: 'node_msg_refund_settled',
          trueNodeId: null,
          falseNodeId: null,
          config: {}
        },
        {
          id: 'node_msg_refund_settled',
          type: 'action',
          label: 'WhatsApp: Refund Credited Notice',
          nextNodeId: null,
          trueNodeId: null,
          falseNodeId: null,
          config: {
            channel: 'whatsapp',
            customBody:
              `*UNIVERSE: REFUND CREDITED* 🎉\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `Your refund has been transferred directly into your bank account via UPI.\n\n` +
              `📋 Order: #{{orderNumber}} ({{storeName}})\n` +
              `💰 Amount Credited: {{amount}}\n` +
              `💳 Transferred to: {{customerUpi}}\n` +
              `📌 Bank Ref / UTR: {{utr}}\n\n` +
              `Please check your UPI app (GPay / PhonePe / Paytm). ❤️\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `UniVerse Campus Dining • Thank you for your patience!`,
            btn1Text: '📱 View Order Tracker',
            btn2Text: '💬 WhatsApp Support'
          }
        }
      ]
    });
    await refundSettledJourney.save();
    console.log('Created and activated Journey: UniVerse Instant Refund Settled Notice');
  } else {
    refundSettledJourney.status = 'Active';
    refundSettledJourney.nodes[1].config = {
      channel: 'whatsapp',
      customBody:
        `*UNIVERSE: REFUND CREDITED* 🎉\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Your refund has been transferred directly into your bank account via UPI.\n\n` +
        `📋 Order: #{{orderNumber}} ({{storeName}})\n` +
        `💰 Amount Credited: {{amount}}\n` +
        `💳 Transferred to: {{customerUpi}}\n` +
        `📌 Bank Ref / UTR: {{utr}}\n\n` +
        `Please check your UPI app (GPay / PhonePe / Paytm). ❤️\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `UniVerse Campus Dining • Thank you for your patience!`,
      btn1Text: '📱 View Order Tracker',
      btn2Text: '💬 WhatsApp Support'
    };
    refundSettledJourney.markModified('nodes');
    await refundSettledJourney.save();
    console.log('Updated existing Refund Settled Journey to Active with bold brand template.');
  }

  await mongoose.disconnect();
  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
