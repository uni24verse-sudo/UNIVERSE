const mongoose = require('mongoose');
const Order = require('./models/Order');
const Store = require('./models/Store');
const Settlement = require('./models/Settlement');
require('dotenv').config();

async function deepCheck() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universe');
        console.log('Connected to DB');

        const store = await Store.findOne({ name: /Hhh/i });
        if (!store) return;

        const settlements = await Settlement.find({ store: store._id }).sort({ createdAt: -1 });
        
        for (const s of settlements) {
            console.log(`\n--- Settlement [${s._id}] ---`);
            console.log(`Type: ${s.settlementType}, Status: ${s.status}, Revenue: ₹${s.totalRevenue}, Net: ₹${s.netPayable}`);
            console.log(`Created At: ${s.createdAt}`);
            
            const orders = await Order.find({ settlementId: s._id });
            console.log(`Linked Orders Count: ${orders.length}`);
            let orderSum = 0;
            orders.forEach(o => {
                orderSum += o.totalAmount;
            });
            console.log(`Sum of Linked Orders: ₹${orderSum}`);
            if (orders.length > 0 && orders.length < 10) {
                orders.forEach(o => console.log(`  - Order #${o.orderNumber}: ₹${o.totalAmount} (${o.status})`));
            }
        }

        const unlinkedOrders = await Order.find({ store: store._id, isSettled: { $ne: true }, status: { $in: ['Completed', 'Cancelled'] } });
        console.log(`\n--- Unlinked Orders (Completed/Cancelled) ---`);
        console.log(`Count: ${unlinkedOrders.length}`);
        unlinkedOrders.forEach(o => console.log(`  - Order #${o.orderNumber}: ₹${o.totalAmount} (${o.status})`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

deepCheck();
