const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const State = mongoose.model('UserJourneyState', new mongoose.Schema({}, { strict: false }));
  const states = await State.find({ phone: '7985397373' }).sort({ createdAt: -1 }).limit(10);
  console.log('States for 7985397373:');
  states.forEach(s => {
    console.log({
      id: s._id,
      orderId: s.metadata?.orderId,
      orderNumber: s.metadata?.orderNumber,
      currentNodeId: s.currentNodeId,
      status: s.status,
      historyCount: s.history?.length,
      createdAt: s.createdAt
    });
  });
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
