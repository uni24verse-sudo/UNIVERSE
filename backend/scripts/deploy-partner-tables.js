const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🚀 Running partner tables migration...');
  
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
  console.log('✅ "partners" table ready.');

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
  console.log('✅ "distributionruns" table ready.');

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
  console.log('✅ "partnerpayouts" table ready.');

  console.log('🎉 Migration completed successfully.');
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
