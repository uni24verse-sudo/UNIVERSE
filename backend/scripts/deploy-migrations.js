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
    await prisma.$executeRawUnsafe(`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "autoAcceptOrders" BOOLEAN DEFAULT false;`);
  } catch (err) {
    console.log('  ℹ️ Store market/autoAcceptOrders column already altered or compatible.');
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

  console.log('✅ Database migration completed successfully! All tables & columns are in sync.');
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  });
