require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Store = require('../models/Store');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const stores = await Store.find({}, 'name market');
        console.log(`Total stores: ${stores.length}`);
        stores.forEach(s => console.log(`- ${s.name} (${s.market})`));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
