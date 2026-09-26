const prisma = require('../config/prisma');

async function initGlobalOffers() {
  console.log('Connecting to PostgreSQL to verify global_offers table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS global_offers (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      "discountType" VARCHAR(64) NOT NULL,
      "discountValue" FLOAT NOT NULL,
      "minOrderValue" FLOAT DEFAULT 0,
      "maxDiscountCap" FLOAT DEFAULT 0,
      "startDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "endDate" TIMESTAMP WITH TIME ZONE,
      "badgeText" VARCHAR(64) DEFAULT '',
      "bannerText" VARCHAR(255) DEFAULT '',
      "isActive" BOOLEAN DEFAULT true,
      "isGlobal" BOOLEAN DEFAULT true,
      "applicableStores" JSONB DEFAULT '[]'::jsonb,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('Table global_offers verified successfully.');

  // Seed two high-value campus-wide deals if empty
  const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM global_offers`);
  const count = countRes[0]?.count || 0;
  console.log(`Current global_offers count: ${count}`);

  if (count === 0) {
    console.log('Seeding default platform-wide global coupons...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO global_offers (
        id, code, title, description, "discountType", "discountValue", "minOrderValue", "maxDiscountCap", "badgeText", "bannerText", "isActive", "isGlobal"
      ) VALUES
      (
        'global-offer-campus10',
        'CAMPUS10',
        'Campus Special: 10% Flat Savings',
        'Enjoy 10% off across any food court stall on campus orders above ₹99',
        'PERCENTAGE_CART',
        10,
        99,
        50,
        '⚡ 10% OFF',
        'Use code CAMPUS10 for flat 10% off any stall!',
        true,
        true
      ),
      (
        'global-offer-welcome30',
        'WELCOME30',
        'Super Flat ₹30 Off All Carts',
        'Flat ₹30 off on any food order across campus above ₹149',
        'FLAT_DISCOUNT_CART',
        30,
        149,
        30,
        '⚡ FLAT ₹30 OFF',
        'Use code WELCOME30 for ₹30 off any cart!',
        true,
        true
      );
    `);
    console.log('Seeded CAMPUS10 and WELCOME30 global platform offers successfully!');
  }

  const allOffers = await prisma.$queryRawUnsafe(`SELECT * FROM global_offers`);
  console.log('Active Global Offers in Database:', allOffers.map(o => ({ code: o.code, title: o.title, discountType: o.discountType })));
  await prisma.$disconnect();
}

initGlobalOffers().catch(err => {
  console.error('Failed to init global offers:', err);
  process.exit(1);
});
