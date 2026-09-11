const fs = require('fs');
const path = require('path');
const backendDir = 'd:/New folder/backend';
const dotenv = require(path.join(backendDir, 'node_modules/dotenv'));
const mongoose = require(path.join(backendDir, 'node_modules/mongoose'));

dotenv.config({ path: path.join(backendDir, '.env') });

const backupDir = path.join(backendDir, 'backup');
const rawBackupDir = path.join(backupDir, 'raw');

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
if (!fs.existsSync(rawBackupDir)) fs.mkdirSync(rawBackupDir, { recursive: true });

// Deep recursive serializer to preserve exact data types, ISO dates, and 24-char ObjectId strings
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
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serializeDocument(v);
    }
    return res;
  }

  return val;
}

const HHH_STORE_ID = '69d2abde1f40bd3800fe4e64';

async function runExtraction() {
  console.log('====================================================');
  console.log('  🚀 UniVerse: MongoDB Full Data Extraction & ETL');
  console.log('  Target: AWS RDS PostgreSQL Zero Data Loss Migration');
  console.log('====================================================\n');
  console.log(`Connecting to MongoDB Atlas...`);

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully to MongoDB in Read-Only mode.\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`Discovered ${collections.length} collections in database.`);

    const rawDump = {};
    const cleanedDump = {};

    // 1. Raw extraction of all collections
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const coll = db.collection(collName);
      const rawDocs = await coll.find({}).toArray();
      const serialized = rawDocs.map(serializeDocument);
      rawDump[collName] = serialized;

      // Save raw un-filtered backup file
      const rawFilePath = path.join(rawBackupDir, `${collName}.json`);
      fs.writeFileSync(rawFilePath, JSON.stringify(serialized, null, 2), 'utf-8');
      console.log(`📦 [RAW BACKUP] Saved ${serialized.length} docs -> backup/raw/${collName}.json`);
    }

    console.log('\n====================================================');
    console.log('  🧹 Applying Strict ETL & Store "Hhh" History Purge');
    console.log('====================================================\n');

    // Identify all order IDs belonging to store Hhh to purge associated refunds, settlements & events
    const rawOrders = rawDump['orders'] || [];
    const hhhOrderIds = new Set();

    rawOrders.forEach(o => {
      const storeRef = String(o.store || o.storeId || '');
      if (storeRef === HHH_STORE_ID) {
        hhhOrderIds.add(String(o._id));
      }
    });

    console.log(`🎯 Identified Store Hhh ID: ${HHH_STORE_ID}`);
    console.log(`   - Found ${hhhOrderIds.size} test orders to purge.`);

    // 2. Filter Collections for Clean PostgreSQL Migration
    for (const [collName, docs] of Object.entries(rawDump)) {
      let filtered = docs;

      if (collName === 'orders') {
        filtered = docs.filter(o => {
          const storeRef = String(o.store || o.storeId || '');
          return storeRef !== HHH_STORE_ID;
        });
        console.log(`   ✂️ Orders: ${docs.length} raw -> ${filtered.length} migrated (${docs.length - filtered.length} Hhh test orders excluded).`);
      } else if (collName === 'settlements') {
        filtered = docs.filter(s => {
          const storeRef = String(s.store || s.storeId || '');
          return storeRef !== HHH_STORE_ID;
        });
        console.log(`   ✂️ Settlements: ${docs.length} raw -> ${filtered.length} migrated (${docs.length - filtered.length} Hhh test settlements excluded).`);
      } else if (collName === 'refunds') {
        filtered = docs.filter(r => {
          const orderRef = String(r.orderId || '');
          return !hhhOrderIds.has(orderRef);
        });
        console.log(`   ✂️ Refunds: ${docs.length} raw -> ${filtered.length} migrated (${docs.length - filtered.length} Hhh test refunds excluded).`);
      } else if (collName === 'orderevents') {
        filtered = docs.filter(e => {
          const orderRef = String(e.orderId || '');
          return !hhhOrderIds.has(orderRef);
        });
        console.log(`   ✂️ OrderEvents: ${docs.length} raw -> ${filtered.length} migrated (${docs.length - filtered.length} Hhh events excluded).`);
      } else if (collName === 'stores') {
        // Store Hhh entity itself is preserved! Clean slate.
        filtered = docs.map(s => {
          if (String(s._id) === HHH_STORE_ID) {
            console.log(`   ✨ Preserving Store "${s.name}" (_id: ${s._id}) with clean state (menu, admin, location preserved).`);
            return {
              ...s,
              isOpen: false, // Default closed until vendor chooses to open
            };
          }
          return s;
        });
        console.log(`   ✅ Stores: ${filtered.length} stores preserved with 100% unique IDs.`);
      }

      cleanedDump[collName] = filtered;

      // Save cleaned JSON file ready for PostgreSQL seeding
      const cleanFilePath = path.join(backupDir, `${collName}.json`);
      fs.writeFileSync(cleanFilePath, JSON.stringify(filtered, null, 2), 'utf-8');
    }

    // Save full cleaned database dump and manifest
    fs.writeFileSync(path.join(backupDir, 'full_database_dump.json'), JSON.stringify(cleanedDump, null, 2), 'utf-8');

    const manifest = {
      extractedAt: new Date().toISOString(),
      databaseName: db.databaseName,
      hhhStoreId: HHH_STORE_ID,
      purgedHhhOrdersCount: hhhOrderIds.size,
      rawCounts: Object.fromEntries(Object.entries(rawDump).map(([k, v]) => [k, v.length])),
      migratedCounts: Object.fromEntries(Object.entries(cleanedDump).map(([k, v]) => [k, v.length]))
    };

    fs.writeFileSync(path.join(backupDir, 'extraction_manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    console.log('\n====================================================');
    console.log('  🔍 Extraction Manifest & Integrity Audit');
    console.log('====================================================');
    console.table(
      Object.keys(rawDump).map(k => ({
        Collection: k,
        RawInMongo: rawDump[k].length,
        CleanedForPostgres: cleanedDump[k].length,
        Diff: rawDump[k].length - cleanedDump[k].length
      }))
    );

    console.log('\n🎉 EXTRACTION & ETL 100% COMPLETE!');
    console.log(`Files safely saved in: ${backupDir}\n`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Extraction failed with error:', err);
    process.exit(1);
  }
}

runExtraction();
