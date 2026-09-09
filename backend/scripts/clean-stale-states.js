const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const State = mongoose.model('UserJourneyState', new mongoose.Schema({}, { strict: false }));
  
  // Mark all old pending/waiting states before this minute as Completed or Cancelled
  const res = await State.updateMany(
    { status: { $in: ['Pending', 'Waiting_Event'] } },
    { $set: { status: 'Cancelled' } }
  );

  console.log(`✅ Cleared ${res.modifiedCount} stale pending/waiting journey states from previous test runs.`);
  process.exit(0);
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
