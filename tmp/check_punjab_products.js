require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Store = require('../models/Store');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const store = await Store.findOne({ name: 'Taste of Punjab' });
        if (!store) {
            console.log("Store not found");
        } else {
            console.log(`Store: ${store.name}`);
            store.products.forEach(p => {
                console.log(`- Product: ${p.name}, isAvailable: ${p.isAvailable}, type: ${typeof p.isAvailable}`);
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
