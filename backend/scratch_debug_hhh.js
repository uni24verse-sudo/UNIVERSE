const mongoose = require('mongoose');
const Order = require('./models/Order');
const Store = require('./models/Store');
const Settlement = require('./models/Settlement');
require('dotenv').config();

async function checkStore() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universe');
        console.log('Connected to DB');

        const store = await Store.findOne({ name: /Hhh/i });
        if (!store) {
            console.log('Store Hhh not found');
            return;
        }

        console.log(`Store Found: ${store.name} (${store._id})`);
        console.log(`Trial Started: ${store.isTrialStarted}, End Date: ${store.trialEndDate}`);

        const completedOrders = await Order.find({ store: store._id, status: 'Completed' });
        const cancelledOrders = await Order.find({ store: store._id, status: 'Cancelled' });

        console.log('\n--- Completed Orders ---');
        let totalCompleted = 0;
        completedOrders.forEach(o => {
            console.log(`Order #${o.orderNumber}: ₹${o.totalAmount}, Settled: ${o.isSettled}`);
            totalCompleted += o.totalAmount;
        });
        console.log(`Total Completed: ₹${totalCompleted}`);

        console.log('\n--- Cancelled Orders ---');
        let totalCancelledPaid = 0;
        cancelledOrders.forEach(o => {
            console.log(`Order #${o.orderNumber}: ₹${o.totalAmount}, Payment: ${o.paymentStatus}, Settled: ${o.isSettled}`);
            if (o.paymentStatus === 'Confirmed') {
                totalCancelledPaid += o.totalAmount;
            }
        });
        console.log(`Total Cancelled (Paid): ₹${totalCancelledPaid}`);

        console.log('\n--- Settlements ---');
        const settlements = await Settlement.find({ store: store._id });
        settlements.forEach(s => {
            console.log(`Type: ${s.settlementType}, Status: ${s.status}, Revenue: ₹${s.totalRevenue}, Net: ₹${s.netPayable}, Fees:`, s.feesBreakdown);
        });

        // Manual Calculation check
        const gatewayFee = totalCompleted * 0.02;
        const platformProfit = 0; // Trial
        const penalty = totalCancelledPaid * 0.04;
        const totalDeductions = gatewayFee + platformProfit + penalty;
        const expectedNet = totalCompleted - totalDeductions;

        console.log('\n--- Calculation Check ---');
        console.log(`Gateway Fee (2% of ${totalCompleted}): ₹${gatewayFee}`);
        console.log(`Penalty (4% of ${totalCancelledPaid}): ₹${penalty}`);
        console.log(`Expected Net: ₹${expectedNet}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkStore();
