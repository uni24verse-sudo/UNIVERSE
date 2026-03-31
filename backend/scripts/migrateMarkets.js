require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Store = require('../models/Store');

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const result = await Store.updateMany(
            { market: /Hospital/i },
            { $set: { market: 'LIT Market' } }
        );

        console.log(`\n✅ Migration successful!`);
        console.log(`------------------------------------------------`);
        console.log(`Matched:   ${result.matchedCount} stores`);
        console.log(`Modified:  ${result.modifiedCount} stores`);
        console.log(`------------------------------------------------\n`);
        
        process.exit(0);
    } catch (err) {
        console.error('Error during market migration:', err);
        process.exit(1);
    }
};

run();
