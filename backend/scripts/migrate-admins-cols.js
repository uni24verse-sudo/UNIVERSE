require('dotenv').config();
const prisma = require('../config/prisma');

async function migrate() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE admins 
    ADD COLUMN IF NOT EXISTS "storeId" TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS "vendorId" TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
  `);
  console.log('Columns storeId, vendorId, status added to admins table if not exists.');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
