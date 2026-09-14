require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prodDbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
const uatDbUrl = process.env.UAT_DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

const prodPrisma = new PrismaClient({
  datasources: { db: { url: prodDbUrl } }
});

const uatPrisma = new PrismaClient({
  datasources: { db: { url: uatDbUrl } }
});

async function sync() {
  console.log('--- SYNCING PRODUCTION LOCATIONS & STORES TO UAT SUPABASE ---');

  // 1. Sync Locations
  const locations = await prodPrisma.location.findMany();
  console.log(`Found ${locations.length} locations in production.`);
  for (const loc of locations) {
    await uatPrisma.location.upsert({
      where: { id: loc.id },
      create: {
        id: loc.id,
        name: loc.name,
        type: loc.type,
        city: loc.city,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt
      },
      update: {
        name: loc.name,
        type: loc.type,
        city: loc.city
      }
    });
    console.log(`  Synced location: ${loc.name} (${loc.id})`);
  }

  // 2. Sync Vendor Admins
  const admins = await prodPrisma.admin.findMany();
  console.log(`Found ${admins.length} admins in production.`);
  for (const adm of admins) {
    await uatPrisma.admin.upsert({
      where: { email: adm.email },
      create: {
        id: adm.id,
        name: adm.name,
        email: adm.email,
        password: adm.password,
        phone: adm.phone,
        role: adm.role,
        status: adm.status || 'active',
        storeId: adm.storeId,
        vendorId: adm.vendorId,
        whatsappNumber: adm.whatsappNumber,
        whatsappApiKey: adm.whatsappApiKey
      },
      update: {
        name: adm.name,
        phone: adm.phone,
        role: adm.role,
        storeId: adm.storeId,
        vendorId: adm.vendorId
      }
    });
  }
  console.log(`  Synced all admins.`);

  // 3. Sync Stores
  const stores = await prodPrisma.store.findMany();
  console.log(`Found ${stores.length} stores in production.`);
  for (const s of stores) {
    await uatPrisma.store.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        adminId: s.adminId,
        name: s.name,
        category: s.category || 'General',
        market: s.market || 'BH1 Market',
        locationId: s.locationId,
        image: s.image || '',
        qrLink: s.qrLink || '',
        isOpen: s.isOpen ?? true,
        openingTime: s.openingTime || '10:00',
        closingTime: s.closingTime || '22:00',
        isAutomated: s.isAutomated ?? true,
        isHidden: s.isHidden ?? false,
        packagingCharge: s.packagingCharge || 0,
        priority: s.priority || 0,
        isTrialStarted: s.isTrialStarted ?? false,
        trialStartDate: s.trialStartDate,
        trialEndDate: s.trialEndDate,
        subscriptionStatus: s.subscriptionStatus || 'trial',
        commissionRate: s.commissionRate || 5,
        upiId: s.upiId || '',
        categoryImages: s.categoryImages || [],
        accentColor: s.accentColor || '#ef4123',
        storeType: s.storeType || 'FastFood',
        products: s.products || [],
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      },
      update: {
        name: s.name,
        isOpen: s.isOpen ?? true,
        locationId: s.locationId,
        market: s.market,
        products: s.products || [],
        categoryImages: s.categoryImages || []
      }
    });
    console.log(`  Synced store: ${s.name} (${s.id})`);
  }

  console.log('✅ ALL PRODUCTION LOCATIONS, VENDORS, AND STORES SYNCED TO UAT SUPABASE!');
}

sync()
  .catch(err => console.error('Sync Error:', err))
  .finally(async () => {
    await prodPrisma.$disconnect();
    await uatPrisma.$disconnect();
  });
