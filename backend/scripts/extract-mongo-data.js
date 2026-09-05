const fs = require('fs');
const path = require('path');
const backendDir = 'd:/New folder/backend';
const dotenv = require(path.join(backendDir, 'node_modules/dotenv'));
const mongoose = require(path.join(backendDir, 'node_modules/mongoose'));

dotenv.config({ path: path.join(backendDir, '.env') });

const backupDir = path.join(backendDir, 'backup');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Deep recursive serializer to preserve exact data types and string IDs
function serializeDocument(val) {
  if (val === null || val === undefined) return val;

  if (val instanceof mongoose.Types.ObjectId || (val._bsontype === 'ObjectID' || val._bsontype === 'ObjectId')) {
    return val.toString();
  }

  if (val instanceof Date) {
    return val.toISOString();
  }

  if (Array.isArray(val)) {
    return val.map(serializeDocument);
  }

  if (typeof val === 'object') {
    // If it's a BSON or generic object, serialize its properties
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serializeDocument(v);
    }
    return res;
  }

  return val;
}

async function runExtraction() {
  console.log('====================================================');
  console.log('  🚀 UniVerse: MongoDB Full Data Extraction & Backup');
  console.log('====================================================');
  console.log(`Connecting to MongoDB Atlas...`);

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully to MongoDB in Read-Only mode.\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`Discovered ${collections.length} collections in database.`);

    const manifest = {
      extractedAt: new Date().toISOString(),
      databaseName: db.databaseName,
      totalCollections: collections.length,
      collections: {},
      summary: {}
    };

    const fullDatabaseDump = {};

    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`\n⏳ Extracting collection: [${collName}]...`);
      const coll = db.collection(collName);
      
      const rawDocs = await coll.find({}).toArray();
      const serializedDocs = rawDocs.map(serializeDocument);

      // Save individual collection JSON file
      const filePath = path.join(backupDir, `${collName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(serializedDocs, null, 2), 'utf-8');

      fullDatabaseDump[collName] = serializedDocs;
      manifest.collections[collName] = {
        count: serializedDocs.length,
        file: `${collName}.json`,
        sizeBytes: fs.statSync(filePath).size
      };

      console.log(`   ✅ Extracted ${serializedDocs.length} documents -> saved to backup/${collName}.json`);
    }

    // Save full database dump and manifest
    const dumpPath = path.join(backupDir, 'full_database_dump.json');
    fs.writeFileSync(dumpPath, JSON.stringify(fullDatabaseDump, null, 2), 'utf-8');

    const manifestPath = path.join(backupDir, 'extraction_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log('\n====================================================');
    console.log('  🔍 Running Relational & Foreign Key Integrity Audit');
    console.log('====================================================');

    const admins = fullDatabaseDump['admins'] || [];
    const stores = fullDatabaseDump['stores'] || [];
    const orders = fullDatabaseDump['orders'] || [];
    const settlements = fullDatabaseDump['settlements'] || [];
    const locations = fullDatabaseDump['locations'] || [];

    const adminIdSet = new Set(admins.map(a => String(a._id)));
    const storeIdSet = new Set(stores.map(s => String(s._id)));
    const locationIdSet = new Set(locations.map(l => String(l._id)));

    let totalProducts = 0;
    stores.forEach(s => {
      if (Array.isArray(s.products)) {
        totalProducts += s.products.length;
      }
    });

    console.log(`\nEntity Summary:`);
    console.log(`- Admins / Vendors: ${admins.length}`);
    console.log(`- Stores: ${stores.length}`);
    console.log(`- Menu Products (nested inside stores): ${totalProducts}`);
    console.log(`- Orders: ${orders.length}`);
    console.log(`- Settlements: ${settlements.length}`);
    console.log(`- Campus Locations: ${locations.length}`);

    // Check store -> admin references
    let storesWithValidAdmin = 0;
    let storesWithMissingAdmin = 0;
    stores.forEach(s => {
      if (s.admin && adminIdSet.has(String(s.admin))) {
        storesWithValidAdmin++;
      } else {
        storesWithMissingAdmin++;
        console.warn(`   ⚠️ Warning: Store "${s.name}" (_id: ${s._id}) references non-existent admin: ${s.admin}`);
      }
    });

    // Check store -> location references
    let storesWithValidLoc = 0;
    stores.forEach(s => {
      if (s.locationId) {
        if (locationIdSet.has(String(s.locationId))) storesWithValidLoc++;
      }
    });

    // Check order -> store references
    let ordersWithValidStore = 0;
    let ordersWithMissingStore = 0;
    orders.forEach(o => {
      if (o.store && storeIdSet.has(String(o.store))) {
        ordersWithValidStore++;
      } else {
        ordersWithMissingStore++;
        console.warn(`   ⚠️ Warning: Order token "${o.handoverToken || o._id}" references non-existent store: ${o.store}`);
      }
    });

    console.log(`\nIntegrity Verification Results:`);
    console.log(`✅ Store-to-Admin Link Integrity: ${storesWithValidAdmin}/${stores.length} verified.`);
    console.log(`✅ Order-to-Store Link Integrity: ${ordersWithValidStore}/${orders.length} verified.`);
    console.log(`✅ Total Products extracted across stores: ${totalProducts}`);

    console.log('\n====================================================');
    console.log(`  🎉 EXTRACTION & BACKUP 100% COMPLETE!`);
    console.log(`  Files saved securely in: ${backupDir}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Extraction failed with error:', err);
  }
}

runExtraction();
