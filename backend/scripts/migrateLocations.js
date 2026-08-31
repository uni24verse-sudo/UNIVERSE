const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Location = require('../models/Location');
const Store = require('../models/Store');

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/universe';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.');

    // 1. Create Lovely Professional University Location
    let lpuLocation = await Location.findOne({ name: 'Lovely Professional University' });
    
    if (!lpuLocation) {
      console.log('Creating LPU location...');
      lpuLocation = new Location({
        name: 'Lovely Professional University',
        type: 'College',
        city: 'Phagwara'
      });
      await lpuLocation.save();
      console.log('LPU location created.');
    } else {
      console.log('LPU location already exists.');
    }

    // 2. Link all existing stores to LPU
    console.log('Linking existing stores to LPU...');
    const result = await Store.updateMany(
      { locationId: { $exists: false } },
      { $set: { locationId: lpuLocation._id } }
    );
    
    console.log(`Migration complete. Updated ${result.modifiedCount} stores.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
