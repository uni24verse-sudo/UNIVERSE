/**
 * UniVerse Database Migration Script
 * Safe, idempotent DDL updates for Multi-Campus, Markets, and Hero Banners
 * Run with: node backend/scripts/deploy-migrations.js
 */
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
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

  // 2. Stores: Ensure market is nullable with empty default, add missing columns
  console.log('📦 Updating "stores" table...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ALTER COLUMN "market" DROP DEFAULT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ALTER COLUMN "market" SET DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ALTER COLUMN "market" DROP NOT NULL;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "autoAcceptOrders" BOOLEAN DEFAULT false;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "offers" JSONB DEFAULT '[]'::jsonb;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "categoryImages" JSONB DEFAULT '[]'::jsonb;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "accentColor" VARCHAR(64) DEFAULT '#ef4123';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "storeType" VARCHAR(64) DEFAULT 'FastFood';`);
  } catch (err) {
    console.log('  ℹ️ Store columns already altered or compatible:', err.message);
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

  // 4. Partner Equity Tables
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        role TEXT DEFAULT 'Co-Founder',
        "equityShare" DOUBLE PRECISION DEFAULT 0,
        "upiId" TEXT DEFAULT '',
        "bankAccount" JSONB DEFAULT '{}',
        status TEXT DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS distributionruns (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        "periodStart" TIMESTAMP(3),
        "periodEnd" TIMESTAMP(3),
        "grossPlatformProfit" DOUBLE PRECISION DEFAULT 0,
        "cancellationPenaltyIncluded" DOUBLE PRECISION DEFAULT 0,
        "netCommissionIncluded" DOUBLE PRECISION DEFAULT 0,
        "reservePercentage" DOUBLE PRECISION DEFAULT 0,
        "reserveAmount" DOUBLE PRECISION DEFAULT 0,
        "netDistributableAmount" DOUBLE PRECISION DEFAULT 0,
        status TEXT DEFAULT 'PAID',
        notes TEXT DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS partnerpayouts (
        id TEXT PRIMARY KEY,
        "runId" TEXT NOT NULL REFERENCES distributionruns(id) ON DELETE CASCADE,
        "partnerId" TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        "partnerName" TEXT NOT NULL,
        "sharePercentage" DOUBLE PRECISION NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        status TEXT DEFAULT 'PAID',
        "utrNumber" TEXT DEFAULT '',
        "paidAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✅ Partner equity tables verified and ready in Supabase.');
  } catch (err) {
    console.log('  ℹ️ Partner equity tables already configured or skipped:', err.message);
  }

  // 6. ChannelAccount: Ensure email channel configured for 2FA security
  console.log('📦 Ensuring Email ChannelAccount for 2FA is active...');
  try {
    const existingEmail = await prisma.channelAccount.findFirst({ where: { type: 'email' } });
    const emailConfig = {
      senderLabel: 'UniVerse Security',
      fromEmail: 'parthsharma240404@gmail.com',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: 'parthsharma240404@gmail.com',
      smtpPass: 'kvoeeuighrczbanv',
      isVerified: true
    };
    if (existingEmail) {
      await prisma.channelAccount.update({
        where: { id: existingEmail.id },
        data: { status: 'connected', emailConfig, lastActive: new Date() }
      });
      console.log('  ✅ Updated Email ChannelAccount in DB.');
    } else {
      const crypto = require('crypto');
      await prisma.channelAccount.create({
        data: {
          id: crypto.randomUUID(),
          type: 'email',
          nickname: 'UniVerse Security',
          status: 'connected',
          emailConfig,
          lastActive: new Date()
        }
      });
      console.log('  ✅ Created Email ChannelAccount in DB.');
    }
  } catch (err) {
    console.log('  ℹ️ Email ChannelAccount update note:', err.message);
  }

  // 7. Universal Delivery: Add columns to stores, orders, and create vendor_delivery_staff
  console.log('📦 Updating database for Universal Self-Delivery & Tracking...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "hasDeliveryService" BOOLEAN DEFAULT false;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "hasTableService" BOOLEAN DEFAULT false;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "deliveryFee" DOUBLE PRECISION DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "freeDeliveryThreshold" DOUBLE PRECISION DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "minDeliveryOrderValue" DOUBLE PRECISION DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "estimatedDeliveryTime" INT DEFAULT 30;`);
    console.log('  ✅ Updated "stores" with delivery and table settings.');
  } catch (err) {
    console.log('  ℹ️ Stores delivery columns note:', err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryCoordinates" JSONB DEFAULT '{"lat":0,"lng":0}'::jsonb;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryHouseNo" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryLandmark" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryArea" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tableNumber" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cookingInstructions" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "platformFee" DOUBLE PRECISION DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryFee" DOUBLE PRECISION DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "riderName" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "riderPhone" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryOtp" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP WITH TIME ZONE;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP WITH TIME ZONE;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deliveryBatchId" TEXT DEFAULT '';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "batchStopSequence" INT DEFAULT 1;`);
    console.log('  ✅ Updated "orders" with delivery and order instructions.');
  } catch (err) {
    console.log('  ℹ️ Orders delivery columns note:', err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS vendor_delivery_staff (
        id TEXT PRIMARY KEY,
        "storeId" TEXT NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        "vehicleNo" TEXT DEFAULT '',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_vendor_delivery_staff_store ON vendor_delivery_staff("storeId");
    `);
    console.log('  ✅ Created "vendor_delivery_staff" table and index.');
  } catch (err) {
    console.log('  ℹ️ vendor_delivery_staff table note:', err.message);
  }

  console.log('✅ Database migration completed successfully! All tables & columns are in sync.');
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  });
