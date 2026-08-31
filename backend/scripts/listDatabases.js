require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

const run = async () => {
    try {
        console.log('Connecting to MongoDB cluster...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const adminDb = mongoose.connection.db.admin();
        const dbs = await adminDb.listDatabases();
        
        console.log('Available Databases:');
        dbs.databases.forEach(db => console.log(`- ${db.name} (Size: ${db.sizeOnDisk} bytes)`));
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

run();
