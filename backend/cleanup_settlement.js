const mongoose = require('mongoose');
const Order = require('./models/Order');
const Settlement = require('./models/Settlement');
const { generateSettlements } = require('./services/settlementService');

async function cleanup() {
    const uri = 'mongodb+srv://uni24verse:universeclub@universe.5zjbphd.mongodb.net/test?appName=UniVerse';
    await mongoose.connect(uri);

    const storeId = '69d2abde1f40bd3800fe4e64';
    const correctSettlementId = '69efe6fcaa65b6169f9b74c2';
    const duplicateSettlementId = '69f0fddea737523b4e07f06c';

    console.log('--- Starting Cleanup ---');

    // 1. Mark Apr 27 orders as settled by the correct settlement
    const apr27Start = new Date('2026-04-27T00:00:00.000Z');
    const apr27End = new Date('2026-04-28T00:00:00.000Z');
    
    const updateResult = await Order.updateMany(
        { 
            store: storeId, 
            status: 'Completed',
            createdAt: { $gte: apr27Start, $lt: apr27End }
        },
        { 
            $set: { 
                isSettled: true, 
                settlementId: correctSettlementId 
            } 
        }
    );
    console.log(`Marked ${updateResult.modifiedCount} orders as settled by ${correctSettlementId}`);

    // 2. Delete the duplicate settlement
    const deleteResult = await Settlement.deleteOne({ _id: duplicateSettlementId });
    console.log(`Deleted duplicate settlement ${duplicateSettlementId}: ${deleteResult.deletedCount}`);

    // 3. Re-run settlement for Apr 28 to pick up the 1 rupee order
    console.log('Running settlement for Apr 28...');
    const apr28Date = new Date('2026-04-28T00:00:00.000Z');
    await generateSettlements(apr28Date, storeId);

    console.log('--- Cleanup Finished ---');
    process.exit(0);
}

cleanup().catch(err => {
    console.error(err);
    process.exit(1);
});
