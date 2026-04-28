const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Store = require('../models/Store');
const Order = require('../models/Order');
const { generateSettlements } = require('../services/settlementService');

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        try {
            await mongoose.connection.collection('settlements').dropIndex('store_1_month_1_year_1');
            console.log('Dropped old settlement index.');
        } catch (e) {
            console.log('Index drop ignored or already dropped.');
        }

        const storeName = "Hhh";
        const store = await Store.findOne({ name: { $regex: new RegExp(storeName, "i") } });

        if (!store) {
            console.log(`Store containing "${storeName}" not found.`);
            process.exit(1);
        }

        console.log(`Found store: ${store.name} (ID: ${store._id})`);

        // Generate some mock completed orders for yesterday
        const yesterday = new Date(Date.now() - 86400000);
        yesterday.setHours(14, 0, 0, 0);

        const mockOrder = new Order({
            store: store._id,
            orderNumber: `MOCK-${Math.floor(Math.random() * 10000)}`,
            customerPhone: '9999999999',
            items: [],
            totalAmount: 1500,
            status: 'Completed',
            paymentMethod: 'UPI',
            paymentStatus: 'Confirmed',
            createdAt: yesterday
        });

        await mockOrder.save();
        console.log(`Created mock order for ${store.name} worth ₹1500 on ${yesterday.toISOString()}`);

        // Run settlement for yesterday for this store
        await generateSettlements(yesterday, store._id);
        console.log('Successfully generated test settlement.');

    } catch (err) {
        console.error('Error during test:', err);
    } finally {
        mongoose.disconnect();
    }
};

runTest();
