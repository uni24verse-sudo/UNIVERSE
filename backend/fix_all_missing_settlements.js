const mongoose = require('mongoose');
const { generateSettlements } = require('./services/settlementService');

async function runGlobalFix() {
    await mongoose.connect('mongodb+srv://uni24verse:universeclub@universe.5zjbphd.mongodb.net/test?appName=UniVerse');
    
    console.log('Running global settlement fix to sweep all old unsettled orders...');
    // Setting targetDate to yesterday
    const targetDate = new Date('2026-04-28T00:00:00.000Z');
    
    await generateSettlements(targetDate);
    
    console.log('Done!');
    process.exit(0);
}

runGlobalFix();
