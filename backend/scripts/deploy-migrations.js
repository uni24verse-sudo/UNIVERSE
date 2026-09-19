/**
 * UniVerse Database Migration Script
 * Safe, idempotent DDL updates for Multi-Campus, Markets, and Hero Banners
 * Run with: node backend/scripts/deploy-migrations.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting UniVerse production database migration...');

  // 1. Locations: Add markets column
  console.log('📦 Updating "locations" table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "markets" TEXT DEFAULT '';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "dietaryType" TEXT DEFAULT 'both';
  `);

  // Ensure Lovely Professional University has default markets if empty
  await prisma.$executeRawUnsafe(`
    UPDATE "locations"
    SET "markets" = 'BH1 Market, Block34 Market, LIT Market, Mall Market, BH6 Market, Apartment Market'
    WHERE (LOWER("name") LIKE '%lpu%' OR LOWER("name") LIKE '%lovely%')
      AND ("markets" IS NULL OR "markets" = '');
  `);

  // 2. Stores: Ensure market is nullable with empty default (removes forced BH1 default)
  console.log('📦 Updating "stores" table...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ALTER COLUMN "market" DROP DEFAULT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ALTER COLUMN "market" SET DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ALTER COLUMN "market" DROP NOT NULL;`);
  } catch (err) {
    console.log('  ℹ️ Store market column already altered or compatible.');
  }

  // 3. Hero Banners: Create table and indexes
  console.log('📦 Creating "herobanners" table & indexes...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS herobanners (
      id TEXT PRIMARY KEY,
      "slotIndex" INT NOT NULL DEFAULT 1,
      "locationHub" TEXT NOT NULL,
      "locationId" TEXT DEFAULT '',
      "stallId" TEXT NOT NULL,
      "storeName" TEXT NOT NULL,
      "rawAssetUrl" TEXT DEFAULT '',
      "rawText" TEXT DEFAULT '',
      "bannerUrl" TEXT DEFAULT '',
      "targetUrl" TEXT DEFAULT '',
      "title" TEXT DEFAULT '',
      "tag" TEXT DEFAULT 'Featured Stall',
      "amountPaid" NUMERIC DEFAULT 799,
      "paymentStatus" TEXT DEFAULT 'PAID',
      "status" TEXT DEFAULT 'pending_design',
      "removalReason" TEXT DEFAULT '',
      "termsAccepted" BOOLEAN DEFAULT true,
      "termsText" TEXT DEFAULT 'I understand and agree that this 30-days promotional slot reservation is strictly non-refundable and non-creditable.',
      "startDate" TIMESTAMP WITH TIME ZONE,
      "endDate" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_herobanners_hub_status ON herobanners("locationHub", status);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_herobanners_stall ON herobanners("stallId");
  `);

  console.log('✅ Database migration completed successfully! All tables & columns are in sync.');
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  });
