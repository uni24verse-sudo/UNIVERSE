const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://uni24verse:universeclub@universe.5zjbphd.mongodb.net/test?appName=UniVerse').then(async () => {
    const Settlement = require('./models/Settlement');
    const Store = require('./models/Store'); // need this so populate doesn't fail
    const s = await Settlement.find({status: { $in: ['completed', 'paid'] }}).populate('store');
    console.log(JSON.stringify(s.map(x => ({store: x.store?.name, amount: x.totalRevenue, status: x.status})), null, 2));
    process.exit(0);
});
