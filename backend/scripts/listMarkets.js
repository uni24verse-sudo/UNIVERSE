require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Store = require('../models/Store');
const fs = require('fs');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const markets = await Store.distinct('market');
        const hospitalStores = await Store.find({ market: /Hospital/i });
        
        const output = {
            markets,
            hospitalStoresCount: hospitalStores.length,
            hospitalStoresList: hospitalStores.map(s => ({ name: s.name, market: s.market }))
        };

        fs.writeFileSync('./backend/scripts/marketData.json', JSON.stringify(output, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
