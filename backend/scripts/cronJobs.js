const cron = require('node-cron');
const { generateSettlements } = require('../services/settlementService');

const initCronJobs = () => {
    // Run every day at 12:05 AM
    cron.schedule('5 0 * * *', async () => {
        console.log('--- Running Daily Settlement Generation ---');
        try {
            // This runs for the previous day relative to exactly midnight
            await generateSettlements();
        } catch (err) {
            console.error('Failed to run daily settlements:', err);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('Cron jobs initialized.');
};

module.exports = { initCronJobs };
