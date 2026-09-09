const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const JourneySchema = new mongoose.Schema({
  name: String,
  description: String,
  triggerType: String,
  nodes: Array,
  status: String,
  totalEnrolled: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

const Journey = mongoose.model('Journey', JourneySchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const lifecycleNodes = [
    {
      id: 'node_order_placed',
      type: 'trigger',
      label: '1. Order Placed Trigger',
      config: {},
      position: { x: 60, y: 160 },
      nextNodeId: 'node_msg_placed'
    },
    {
      id: 'node_msg_placed',
      type: 'action',
      label: 'WhatsApp: Order Placed Card',
      config: {
        channel: 'whatsapp',
        customBody: '👋 Hi {{name}}! Your order #{{orderId}} has been placed successfully at {{storeName}} (₹{{amount}}). We will notify you once the kitchen accepts it.',
        btn1Text: '📍 Live Status',
        btn2Text: '💬 Support'
      },
      position: { x: 520, y: 160 },
      nextNodeId: 'node_wait_decision'
    },
    {
      id: 'node_wait_decision',
      type: 'wait_event',
      label: '2. Wait for Kitchen Decision',
      config: {
        eventType: 'order_decision',
        timeoutMinutes: 30
      },
      position: { x: 980, y: 160 },
      nextNodeId: 'node_msg_accepted',
      trueNodeId: 'node_msg_accepted',
      falseNodeId: 'node_msg_rejected'
    },
    {
      id: 'node_msg_accepted',
      type: 'action',
      label: 'WhatsApp: Order Accepted',
      config: {
        channel: 'whatsapp',
        customBody: '🍳 Good news {{name}}! Your order #{{orderId}} has been ACCEPTED by {{storeName}} and is now being prepared in the kitchen.',
        btn1Text: '📍 Prep Status',
        btn2Text: '🧾 Digital Bill'
      },
      position: { x: 1460, y: 60 },
      nextNodeId: 'node_wait_ready'
    },
    {
      id: 'node_msg_rejected',
      type: 'action',
      label: 'WhatsApp: Order Rejected & Refund',
      config: {
        channel: 'whatsapp',
        customBody: 'We are sorry {{name}}, {{storeName}} could not accept your order #{{orderId}}. A full refund of ₹{{amount}} has been initiated.',
        btn1Text: '🔄 Re-order Food',
        btn2Text: '💬 Support'
      },
      position: { x: 1460, y: 440 },
      nextNodeId: null
    },
    {
      id: 'node_wait_ready',
      type: 'wait_event',
      label: '3. Wait for Kitchen Ready',
      config: {
        eventType: 'Order Ready',
        timeoutMinutes: 45
      },
      position: { x: 1940, y: 60 },
      nextNodeId: 'node_msg_ready'
    },
    {
      id: 'node_msg_ready',
      type: 'action',
      label: 'WhatsApp: Ready for Pickup',
      config: {
        channel: 'whatsapp',
        customBody: '🎉 Hot & Ready! Your order #{{orderId}} is READY for pickup at {{storeName}} counter. Please show your pickup QR/token to collect.',
        btn1Text: '📲 Show Pickup QR',
        btn2Text: '📍 Counter Map'
      },
      position: { x: 2420, y: 60 },
      nextNodeId: 'node_wait_complete'
    },
    {
      id: 'node_wait_complete',
      type: 'wait_event',
      label: '4. Wait for QR Handover Scan',
      config: {
        eventType: 'Order Completed',
        timeoutMinutes: 60
      },
      position: { x: 2900, y: 60 },
      nextNodeId: 'node_msg_completed'
    },
    {
      id: 'node_msg_completed',
      type: 'action',
      label: '5. WhatsApp Feedback & Thank You',
      config: {
        channel: 'whatsapp',
        customBody: '✅ Order #{{orderId}} delivered! Thank you for ordering from {{storeName}} on UNIVERSE. Enjoy your meal! ❤️\n\nHow was your experience today?',
        btn1Text: '⭐ 5 Stars - Loved It!',
        btn2Text: '💬 Feedback'
      },
      position: { x: 3380, y: 60 },
      nextNodeId: null
    }
  ];

  let journey = await Journey.findOne({ triggerType: 'Order Placed' });
  if (!journey) {
    journey = new Journey({
      name: '⚡ Real-Time Order Lifecycle Flow',
      description: 'Instant WhatsApp notifications across Placed -> Accepted/Rejected -> Ready -> Completed -> Feedback',
      triggerType: 'Order Placed',
      nodes: lifecycleNodes,
      status: 'Active',
      updatedAt: new Date()
    });
    await journey.save();
    console.log('✅ Created and Activated Real-Time Order Lifecycle Journey:', journey._id);
  } else {
    journey.name = '⚡ Real-Time Order Lifecycle Flow';
    journey.nodes = lifecycleNodes;
    journey.status = 'Active';
    journey.updatedAt = new Date();
    await journey.save();
    console.log('✅ Updated and Activated existing Journey:', journey._id);
  }

  // Also ensure any Repeat Order Placed trigger is handled if present
  let repeatJourney = await Journey.findOne({ triggerType: 'Repeat Order Placed' });
  if (!repeatJourney) {
    repeatJourney = new Journey({
      name: '🔁 Repeat Order Lifecycle Flow',
      description: 'Instant WhatsApp notifications for returning students across Placed -> Accepted -> Ready -> Completed',
      triggerType: 'Repeat Order Placed',
      nodes: lifecycleNodes,
      status: 'Active',
      updatedAt: new Date()
    });
    await repeatJourney.save();
    console.log('✅ Created and Activated Repeat Order Lifecycle Journey:', repeatJourney._id);
  } else {
    repeatJourney.nodes = lifecycleNodes;
    repeatJourney.status = 'Active';
    await repeatJourney.save();
    console.log('✅ Updated Repeat Order Lifecycle Journey:', repeatJourney._id);
  }

  const all = await Journey.find({});
  console.log('\n--- ALL ACTIVE JOURNEYS IN DATABASE ---');
  all.forEach(j => console.log(`• [${j.status}] ${j.name} (Trigger: "${j.triggerType}", Nodes: ${j.nodes?.length})`));

  process.exit(0);
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
