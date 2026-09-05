const fs = require('fs');
const path = require('path');
const backendDir = path.resolve(__dirname, '..');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(backendDir, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const backupDir = path.join(backendDir, 'backup');

function loadBackup(fileName) {
  const p = path.join(backupDir, fileName);
  if (!fs.existsSync(p)) {
    console.warn(`⚠️ Backup file not found: ${fileName}, returning empty array.`);
    return [];
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function seedPostgres() {
  console.log('====================================================');
  console.log('  🚀 UniVerse: PostgreSQL Data Seeder (Prisma)');
  console.log('====================================================\n');

  try {
    // 1. Locations
    const locations = loadBackup('locations.json');
    console.log(`⏳ Seeding ${locations.length} Locations...`);
    for (const loc of locations) {
      await prisma.location.upsert({
        where: { id: String(loc._id) },
        update: {
          name: loc.name || 'Unnamed Location',
          type: loc.type || 'College',
          city: loc.city || '',
          updatedAt: loc.updatedAt ? new Date(loc.updatedAt) : new Date()
        },
        create: {
          id: String(loc._id),
          name: loc.name || 'Unnamed Location',
          type: loc.type || 'College',
          city: loc.city || '',
          createdAt: loc.createdAt ? new Date(loc.createdAt) : new Date(),
          updatedAt: loc.updatedAt ? new Date(loc.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Locations seeded: ${locations.length}`);

    // 2. Admins
    const admins = loadBackup('admins.json');
    console.log(`\n⏳ Seeding ${admins.length} Admins / Vendors...`);
    for (const adm of admins) {
      await prisma.admin.upsert({
        where: { id: String(adm._id) },
        update: {
          name: adm.name,
          email: adm.email,
          password: adm.password,
          role: adm.role || 'vendor',
          telegramChatId: adm.telegramChatId || '',
          isBanned: Boolean(adm.isBanned),
          updatedAt: adm.updatedAt ? new Date(adm.updatedAt) : new Date()
        },
        create: {
          id: String(adm._id),
          name: adm.name,
          email: adm.email,
          password: adm.password,
          role: adm.role || 'vendor',
          telegramChatId: adm.telegramChatId || '',
          isBanned: Boolean(adm.isBanned),
          createdAt: adm.createdAt ? new Date(adm.createdAt) : new Date(),
          updatedAt: adm.updatedAt ? new Date(adm.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Admins seeded: ${admins.length}`);

    // 3. Stores
    const stores = loadBackup('stores.json');
    console.log(`\n⏳ Seeding ${stores.length} Stores with full Menus & Products...`);
    for (const s of stores) {
      await prisma.store.upsert({
        where: { id: String(s._id) },
        update: {
          adminId: String(s.admin),
          name: s.name,
          category: s.category || 'General',
          market: s.market || 'BH1 Market',
          locationId: s.locationId ? String(s.locationId) : null,
          image: s.image || '',
          qrLink: s.qrLink || '',
          isOpen: s.isOpen !== undefined ? Boolean(s.isOpen) : true,
          openingTime: s.openingTime || '10:00',
          closingTime: s.closingTime || '22:00',
          isAutomated: s.isAutomated !== undefined ? Boolean(s.isAutomated) : true,
          isHidden: Boolean(s.isHidden),
          packagingCharge: Number(s.packagingCharge) || 0,
          priority: Number(s.priority) || 0,
          isTrialStarted: Boolean(s.isTrialStarted),
          trialStartDate: s.trialStartDate ? new Date(s.trialStartDate) : null,
          trialEndDate: s.trialEndDate ? new Date(s.trialEndDate) : null,
          subscriptionStatus: s.subscriptionStatus || 'trial',
          commissionRate: Number(s.commissionRate) || 5,
          upiId: s.upiId || '',
          telegramChatId: s.telegramChatId || '',
          telegramBotToken: s.telegramBotToken || '',
          categoryImages: s.categoryImages || [],
          accentColor: s.accentColor || '#ef4123',
          storeType: s.storeType || 'FastFood',
          products: s.products || [],
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
        },
        create: {
          id: String(s._id),
          adminId: String(s.admin),
          name: s.name,
          category: s.category || 'General',
          market: s.market || 'BH1 Market',
          locationId: s.locationId ? String(s.locationId) : null,
          image: s.image || '',
          qrLink: s.qrLink || '',
          isOpen: s.isOpen !== undefined ? Boolean(s.isOpen) : true,
          openingTime: s.openingTime || '10:00',
          closingTime: s.closingTime || '22:00',
          isAutomated: s.isAutomated !== undefined ? Boolean(s.isAutomated) : true,
          isHidden: Boolean(s.isHidden),
          packagingCharge: Number(s.packagingCharge) || 0,
          priority: Number(s.priority) || 0,
          isTrialStarted: Boolean(s.isTrialStarted),
          trialStartDate: s.trialStartDate ? new Date(s.trialStartDate) : null,
          trialEndDate: s.trialEndDate ? new Date(s.trialEndDate) : null,
          subscriptionStatus: s.subscriptionStatus || 'trial',
          commissionRate: Number(s.commissionRate) || 5,
          upiId: s.upiId || '',
          telegramChatId: s.telegramChatId || '',
          telegramBotToken: s.telegramBotToken || '',
          categoryImages: s.categoryImages || [],
          accentColor: s.accentColor || '#ef4123',
          storeType: s.storeType || 'FastFood',
          products: s.products || [],
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Stores seeded: ${stores.length}`);

    // 4. Orders
    const orders = loadBackup('orders.json');
    console.log(`\n⏳ Seeding ${orders.length} Orders...`);
    for (const o of orders) {
      await prisma.order.upsert({
        where: { id: String(o._id) },
        update: {
          storeId: String(o.store),
          customerName: o.customerName || 'Anonymous',
          customerPhone: o.customerPhone || '',
          items: o.items || [],
          totalAmount: Number(o.totalAmount) || 0,
          status: o.status || 'Pending',
          paymentMethod: o.paymentMethod || 'UPI',
          paymentStatus: o.paymentStatus || 'Pending',
          razorpayOrderId: o.razorpayOrderId || '',
          razorpayPaymentId: o.razorpayPaymentId || '',
          handoverToken: o.handoverToken || '',
          cancellationReason: o.cancellationReason || '',
          updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date()
        },
        create: {
          id: String(o._id),
          storeId: String(o.store),
          customerName: o.customerName || 'Anonymous',
          customerPhone: o.customerPhone || '',
          items: o.items || [],
          totalAmount: Number(o.totalAmount) || 0,
          status: o.status || 'Pending',
          paymentMethod: o.paymentMethod || 'UPI',
          paymentStatus: o.paymentStatus || 'Pending',
          razorpayOrderId: o.razorpayOrderId || '',
          razorpayPaymentId: o.razorpayPaymentId || '',
          handoverToken: o.handoverToken || '',
          cancellationReason: o.cancellationReason || '',
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
          updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Orders seeded: ${orders.length}`);

    // 5. Settlements
    const settlements = loadBackup('settlements.json');
    console.log(`\n⏳ Seeding ${settlements.length} Settlements...`);
    for (const set of settlements) {
      await prisma.settlement.upsert({
        where: { id: String(set._id) },
        update: {
          adminId: String(set.admin),
          storeId: String(set.store),
          periodStart: new Date(set.periodStart),
          periodEnd: new Date(set.periodEnd),
          totalOrders: Number(set.totalOrders) || 0,
          grossSales: Number(set.grossSales) || 0,
          gatewayFee: Number(set.gatewayFee) || 0,
          platformCommission: Number(set.platformCommission) || 0,
          cancellationPenalties: Number(set.cancellationPenalties) || 0,
          netPayable: Number(set.netPayable) || 0,
          status: set.status || 'Pending',
          utr: set.utr || '',
          processedAt: set.processedAt ? new Date(set.processedAt) : null,
          updatedAt: set.updatedAt ? new Date(set.updatedAt) : new Date()
        },
        create: {
          id: String(set._id),
          adminId: String(set.admin),
          storeId: String(set.store),
          periodStart: new Date(set.periodStart),
          periodEnd: new Date(set.periodEnd),
          totalOrders: Number(set.totalOrders) || 0,
          grossSales: Number(set.grossSales) || 0,
          gatewayFee: Number(set.gatewayFee) || 0,
          platformCommission: Number(set.platformCommission) || 0,
          cancellationPenalties: Number(set.cancellationPenalties) || 0,
          netPayable: Number(set.netPayable) || 0,
          status: set.status || 'Pending',
          utr: set.utr || '',
          processedAt: set.processedAt ? new Date(set.processedAt) : null,
          createdAt: set.createdAt ? new Date(set.createdAt) : new Date(),
          updatedAt: set.updatedAt ? new Date(set.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Settlements seeded: ${settlements.length}`);

    // 6. Device Registries
    const devices = loadBackup('deviceregistries.json');
    console.log(`\n⏳ Seeding ${devices.length} Device Registries...`);
    for (const dev of devices) {
      await prisma.deviceRegistry.upsert({
        where: { token: dev.token },
        update: {
          platform: dev.platform || 'android',
          deviceInfo: dev.deviceInfo || {},
          updatedAt: dev.updatedAt ? new Date(dev.updatedAt) : new Date()
        },
        create: {
          id: String(dev._id),
          token: dev.token,
          platform: dev.platform || 'android',
          deviceInfo: dev.deviceInfo || {},
          createdAt: dev.createdAt ? new Date(dev.createdAt) : new Date(),
          updatedAt: dev.updatedAt ? new Date(dev.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Device Registries seeded: ${devices.length}`);

    console.log('\n====================================================');
    console.log('  🎉 ALL DATA SEEDED INTO POSTGRESQL SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedPostgres();
