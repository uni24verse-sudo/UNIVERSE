const mongoose = require('mongoose');
require('dotenv').config();

async function updateJourney() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Journey = mongoose.model('Journey', new mongoose.Schema({}, { strict: false }));
  const j = await Journey.findById('6aa17edf9ccbff378e47b711');
  if (!j) {
    console.log('Journey not found');
    process.exit(1);
  }
  const node = j.nodes.find(n => n.id === 'node_msg_rejected');
  if (node) {
    node.config = node.config || {};
    node.config.customBody = "We're sorry, {{storeName}} couldn't accept your order #{{orderId}}. Your refund of ₹{{amount}} is queued for instant direct UPI transfer. Open your live order tracker to confirm your UPI ID: https://www.universeorder.co.in/orders/{{orderId}}";
    node.config.btn1Text = '⚡ Claim UPI Refund';
    node.config.btn2Text = '💬 WhatsApp Support';
    node.nextNodeId = null;
    j.markModified('nodes');
    await j.save();
    console.log('✅ Successfully updated node_msg_rejected in MongoDB Atlas!');
  } else {
    console.log('node_msg_rejected not found in journey');
  }
  process.exit(0);
}

updateJourney().catch(e => { console.error(e); process.exit(1); });
