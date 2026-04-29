const mongoose = require('mongoose');
const Order = require('./models/Order');

async function check() {
    await mongoose.connect('mongodb+srv://uni24verse:universeclub@universe.5zjbphd.mongodb.net/test?appName=UniVerse');
    const orders = await Order.find({ 
        store: '69d2abde1f40bd3800fe4e64', 
        status: 'Completed', 
        createdAt: { $gte: new Date('2026-04-26') } 
    }).sort({ createdAt: 1 });
    console.log(JSON.stringify(orders.map(o => ({ amount: o.totalAmount, createdAt: o.createdAt })), null, 2));
    process.exit(0);
}

check();
