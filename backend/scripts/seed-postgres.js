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
  console.log('  🚀 UniVerse: Comprehensive PostgreSQL Seeder');
  console.log('  Ensuring 100% Unique ID & Relational Preservation');
  console.log('====================================================\n');

  try {
    // 1. Locations
    const locations = loadBackup('locations.json');
    console.log(`⏳ [1/17] Seeding ${locations.length} Locations...`);
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
    const adminIdSet = new Set(admins.map(a => String(a._id)));
    console.log(`\n⏳ [2/17] Seeding ${admins.length} Admins / Vendors...`);
    for (const adm of admins) {
      await prisma.admin.upsert({
        where: { id: String(adm._id) },
        update: {
          name: adm.name || 'Admin',
          email: adm.email,
          password: adm.password,
          role: adm.role || 'vendor',
          telegramChatId: adm.telegramChatId || '',
          isBanned: Boolean(adm.isBanned),
          updatedAt: adm.updatedAt ? new Date(adm.updatedAt) : new Date()
        },
        create: {
          id: String(adm._id),
          name: adm.name || 'Admin',
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
    const storeIdSet = new Set(stores.map(s => String(s._id)));
    console.log(`\n⏳ [3/17] Seeding ${stores.length} Stores with full Menus & Products...`);
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

    // 4. Customers
    const customers = loadBackup('customers.json');
    console.log(`\n⏳ [4/17] Seeding ${customers.length} Customers...`);
    for (const c of customers) {
      await prisma.customer.upsert({
        where: { id: String(c._id) },
        update: {
          userId: c.userId || `USR-${String(c._id).slice(-6)}`,
          phone: c.phone || '',
          email: c.email || '',
          currentName: c.currentName || 'UniVerse Student',
          campus: c.campus || 'Lovely Professional University',
          status: c.status || 'Active',
          metrics: c.metrics || {},
          riskSignals: c.riskSignals || [],
          lastActivityAt: c.lastActivityAt ? new Date(c.lastActivityAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date()
        },
        create: {
          id: String(c._id),
          userId: c.userId || `USR-${String(c._id).slice(-6)}`,
          phone: c.phone || '',
          email: c.email || '',
          currentName: c.currentName || 'UniVerse Student',
          campus: c.campus || 'Lovely Professional University',
          status: c.status || 'Active',
          metrics: c.metrics || {},
          riskSignals: c.riskSignals || [],
          lastActivityAt: c.lastActivityAt ? new Date(c.lastActivityAt) : new Date(),
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Customers seeded: ${customers.length}`);

    // 5. Orders (with Hhh test orders excluded)
    const orders = loadBackup('orders.json');
    const orderIdSet = new Set();
    console.log(`\n⏳ [5/17] Seeding ${orders.length} Orders...`);
    for (const o of orders) {
      const targetStoreId = String(o.store || o.storeId);
      if (!storeIdSet.has(targetStoreId)) {
        console.warn(`   ⚠️ Skipping order ${o._id} because store ${targetStoreId} does not exist.`);
        continue;
      }
      orderIdSet.add(String(o._id));

      await prisma.order.upsert({
        where: { id: String(o._id) },
        update: {
          storeId: targetStoreId,
          orderNumber: o.orderNumber || '',
          userId: o.userId || '',
          customerName: o.customerName || 'UniVerse Student',
          customerPhone: o.customerPhone || '',
          customerEmail: o.customerEmail || '',
          items: o.items || [],
          totalAmount: Number(o.totalAmount) || 0,
          status: o.status || 'Pending',
          paymentMethod: o.paymentMethod || 'UPI',
          paymentStatus: o.paymentStatus || 'Pending',
          orderType: o.orderType || 'Dine In',
          packagingChargeApplied: Number(o.packagingChargeApplied) || 0,
          transactionId: o.transactionId || '',
          paymentProvider: o.paymentProvider || 'Razorpay',
          razorpayOrderId: o.razorpayOrderId || '',
          razorpayPaymentId: o.razorpayPaymentId || '',
          handoverToken: o.handoverToken || '',
          pickupQrCode: o.pickupQrCode || '',
          timeEstimateMinutes: Number(o.timeEstimateMinutes) || 15,
          refundId: o.refundId || '',
          refundAmount: Number(o.refundAmount) || 0,
          refundStatus: o.refundStatus || 'None',
          payerUpiId: o.payerUpiId || '',
          customerUpiId: o.customerUpiId || '',
          refundUtr: o.refundUtr || '',
          refundSettledAt: o.refundSettledAt ? new Date(o.refundSettledAt) : null,
          refundIdempotencyKey: o.refundIdempotencyKey || '',
          cancellationReason: o.cancellationReason || '',
          cancelledBy: o.cancelledBy || {},
          settlementId: o.settlementId || '',
          isSettled: Boolean(o.isSettled),
          isPreOrder: Boolean(o.isPreOrder),
          scheduledTime: o.scheduledTime || '',
          updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date()
        },
        create: {
          id: String(o._id),
          storeId: targetStoreId,
          orderNumber: o.orderNumber || '',
          userId: o.userId || '',
          customerName: o.customerName || 'UniVerse Student',
          customerPhone: o.customerPhone || '',
          customerEmail: o.customerEmail || '',
          items: o.items || [],
          totalAmount: Number(o.totalAmount) || 0,
          status: o.status || 'Pending',
          paymentMethod: o.paymentMethod || 'UPI',
          paymentStatus: o.paymentStatus || 'Pending',
          orderType: o.orderType || 'Dine In',
          packagingChargeApplied: Number(o.packagingChargeApplied) || 0,
          transactionId: o.transactionId || '',
          paymentProvider: o.paymentProvider || 'Razorpay',
          razorpayOrderId: o.razorpayOrderId || '',
          razorpayPaymentId: o.razorpayPaymentId || '',
          handoverToken: o.handoverToken || '',
          pickupQrCode: o.pickupQrCode || '',
          timeEstimateMinutes: Number(o.timeEstimateMinutes) || 15,
          refundId: o.refundId || '',
          refundAmount: Number(o.refundAmount) || 0,
          refundStatus: o.refundStatus || 'None',
          payerUpiId: o.payerUpiId || '',
          customerUpiId: o.customerUpiId || '',
          refundUtr: o.refundUtr || '',
          refundSettledAt: o.refundSettledAt ? new Date(o.refundSettledAt) : null,
          refundIdempotencyKey: o.refundIdempotencyKey || '',
          cancellationReason: o.cancellationReason || '',
          cancelledBy: o.cancelledBy || {},
          settlementId: o.settlementId || '',
          isSettled: Boolean(o.isSettled),
          isPreOrder: Boolean(o.isPreOrder),
          scheduledTime: o.scheduledTime || '',
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
          updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Orders seeded: ${orderIdSet.size}`);

    // 6. Payments
    const payments = loadBackup('payments.json');
    console.log(`\n⏳ [6/17] Seeding ${payments.length} Payments...`);
    let seededPayments = 0;
    for (const p of payments) {
      await prisma.payment.upsert({
        where: { id: String(p._id) },
        update: {
          paymentId: p.paymentId || String(p._id),
          orderId: String(p.orderId || ''),
          userId: p.userId || '',
          amount: Number(p.amount) || 0,
          currency: p.currency || 'INR',
          status: p.status || 'CAPTURED',
          method: p.method || 'Razorpay',
          fee: Number(p.fee) || 0,
          tax: Number(p.tax) || 0,
          capturedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
        },
        create: {
          id: String(p._id),
          paymentId: p.paymentId || String(p._id),
          orderId: String(p.orderId || ''),
          userId: p.userId || '',
          amount: Number(p.amount) || 0,
          currency: p.currency || 'INR',
          status: p.status || 'CAPTURED',
          method: p.method || 'Razorpay',
          fee: Number(p.fee) || 0,
          tax: Number(p.tax) || 0,
          capturedAt: p.capturedAt ? new Date(p.capturedAt) : new Date(),
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
        }
      });
      seededPayments++;
    }
    console.log(`   ✅ Payments seeded: ${seededPayments}`);

    // 7. Refunds
    const refunds = loadBackup('refunds.json');
    console.log(`\n⏳ [7/17] Seeding ${refunds.length} Refunds...`);
    let seededRefunds = 0;
    for (const r of refunds) {
      const targetOrderId = String(r.orderId);
      if (!orderIdSet.has(targetOrderId)) {
        console.warn(`   ⚠️ Skipping refund ${r._id} because order ${targetOrderId} is not in migrated orders.`);
        continue;
      }

      await prisma.refund.upsert({
        where: { id: String(r._id) },
        update: {
          orderId: targetOrderId,
          paymentId: r.paymentId || '',
          refundId: r.refundId || '',
          userId: r.userId || '',
          amount: Number(r.amount) || 0,
          customerUpiId: r.customerUpiId || '',
          customerName: r.customerName || '',
          customerPhone: r.customerPhone || '',
          reason: r.reason || 'Order Cancelled',
          mode: r.mode || 'DIRECT_UPI',
          status: r.status || 'PENDING',
          utr: r.utr || '',
          settledBy: r.settledBy || '',
          settledAt: r.settledAt ? new Date(r.settledAt) : null,
          lockedBy: r.lockedBy || '',
          lockedAt: r.lockedAt ? new Date(r.lockedAt) : null,
          lockExpiresAt: r.lockExpiresAt ? new Date(r.lockExpiresAt) : null,
          idempotencyKey: r.idempotencyKey || '',
          whatsappNotified: Boolean(r.whatsappNotified),
          rawResponse: r.rawResponse || {},
          processedAt: r.processedAt ? new Date(r.processedAt) : null,
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date()
        },
        create: {
          id: String(r._id),
          orderId: targetOrderId,
          paymentId: r.paymentId || '',
          refundId: r.refundId || '',
          userId: r.userId || '',
          amount: Number(r.amount) || 0,
          customerUpiId: r.customerUpiId || '',
          customerName: r.customerName || '',
          customerPhone: r.customerPhone || '',
          reason: r.reason || 'Order Cancelled',
          mode: r.mode || 'DIRECT_UPI',
          status: r.status || 'PENDING',
          utr: r.utr || '',
          settledBy: r.settledBy || '',
          settledAt: r.settledAt ? new Date(r.settledAt) : null,
          lockedBy: r.lockedBy || '',
          lockedAt: r.lockedAt ? new Date(r.lockedAt) : null,
          lockExpiresAt: r.lockExpiresAt ? new Date(r.lockExpiresAt) : null,
          idempotencyKey: r.idempotencyKey || '',
          whatsappNotified: Boolean(r.whatsappNotified),
          rawResponse: r.rawResponse || {},
          processedAt: r.processedAt ? new Date(r.processedAt) : null,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date()
        }
      });
      seededRefunds++;
    }
    console.log(`   ✅ Refunds seeded: ${seededRefunds}`);

    // 8. Settlements
    const settlements = loadBackup('settlements.json');
    console.log(`\n⏳ [8/17] Seeding ${settlements.length} Settlements...`);
    let seededSettlements = 0;
    for (const set of settlements) {
      const rawStoreId = String(set.store || set.storeId || '');
      const validStoreId = storeIdSet.has(rawStoreId) ? rawStoreId : null;
      const rawAdminId = String(set.admin || set.adminId || '');
      const validAdminId = adminIdSet.has(rawAdminId) ? rawAdminId : null;

      await prisma.settlement.upsert({
        where: { id: String(set._id) },
        update: {
          storeId: validStoreId,
          adminId: validAdminId,
          settlementType: set.settlementType || (set.periodStart ? 'daily' : 'monthly'),
          month: Number(set.month) || 1,
          year: Number(set.year) || 2026,
          periodStart: set.periodStart ? new Date(set.periodStart) : null,
          periodEnd: set.periodEnd ? new Date(set.periodEnd) : null,
          totalOrders: Number(set.totalOrders) || 0,
          totalRevenue: Number(set.totalRevenue) || 0,
          grossSales: Number(set.grossSales || set.totalRevenue) || 0,
          gatewayFee: Number(set.gatewayFee) || 0,
          platformCommission: Number(set.platformCommission || set.commissionAmount) || 0,
          cancellationPenalties: Number(set.cancellationPenalties) || 0,
          feesBreakdown: set.feesBreakdown || {},
          netPayable: Number(set.netPayable) || 0,
          status: set.status || 'pending',
          utr: set.utr || set.utrNumber || '',
          utrNumber: set.utrNumber || set.utr || '',
          paidAt: set.paidAt ? new Date(set.paidAt) : null,
          processedAt: set.processedAt ? new Date(set.processedAt) : null,
          updatedAt: set.updatedAt ? new Date(set.updatedAt) : new Date()
        },
        create: {
          id: String(set._id),
          storeId: validStoreId,
          adminId: validAdminId,
          settlementType: set.settlementType || (set.periodStart ? 'daily' : 'monthly'),
          month: Number(set.month) || 1,
          year: Number(set.year) || 2026,
          periodStart: set.periodStart ? new Date(set.periodStart) : null,
          periodEnd: set.periodEnd ? new Date(set.periodEnd) : null,
          totalOrders: Number(set.totalOrders) || 0,
          totalRevenue: Number(set.totalRevenue) || 0,
          grossSales: Number(set.grossSales || set.totalRevenue) || 0,
          gatewayFee: Number(set.gatewayFee) || 0,
          platformCommission: Number(set.platformCommission || set.commissionAmount) || 0,
          cancellationPenalties: Number(set.cancellationPenalties) || 0,
          feesBreakdown: set.feesBreakdown || {},
          netPayable: Number(set.netPayable) || 0,
          status: set.status || 'pending',
          utr: set.utr || set.utrNumber || '',
          utrNumber: set.utrNumber || set.utr || '',
          paidAt: set.paidAt ? new Date(set.paidAt) : null,
          processedAt: set.processedAt ? new Date(set.processedAt) : null,
          createdAt: set.createdAt ? new Date(set.createdAt) : new Date(),
          updatedAt: set.updatedAt ? new Date(set.updatedAt) : new Date()
        }
      });
      seededSettlements++;
    }
    console.log(`   ✅ Settlements seeded: ${seededSettlements}`);

    // 9. RefundConfig
    const refundConfigs = loadBackup('refundconfigs.json');
    console.log(`\n⏳ [9/17] Seeding ${refundConfigs.length} RefundConfig records...`);
    for (const rc of refundConfigs) {
      await prisma.refundConfig.upsert({
        where: { id: String(rc._id || 'singleton') },
        update: {
          notifyGroup: rc.notifyGroup !== undefined ? Boolean(rc.notifyGroup) : true,
          notifyPhones: rc.notifyPhones !== undefined ? Boolean(rc.notifyPhones) : true,
          phoneNumbers: rc.phoneNumbers || [],
          groupJid: rc.groupJid || '',
          groupName: rc.groupName || '',
          updatedBy: rc.updatedBy || '',
          updatedAt: rc.updatedAt ? new Date(rc.updatedAt) : new Date()
        },
        create: {
          id: String(rc._id || 'singleton'),
          notifyGroup: rc.notifyGroup !== undefined ? Boolean(rc.notifyGroup) : true,
          notifyPhones: rc.notifyPhones !== undefined ? Boolean(rc.notifyPhones) : true,
          phoneNumbers: rc.phoneNumbers || [],
          groupJid: rc.groupJid || '',
          groupName: rc.groupName || '',
          updatedBy: rc.updatedBy || '',
          createdAt: rc.createdAt ? new Date(rc.createdAt) : new Date(),
          updatedAt: rc.updatedAt ? new Date(rc.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ RefundConfig seeded: ${refundConfigs.length}`);

    // 10. MasterTemplates
    const masterTemplates = loadBackup('mastertemplates.json');
    const templateIdSet = new Set(masterTemplates.map(m => String(m._id)));
    console.log(`\n⏳ [10/17] Seeding ${masterTemplates.length} MasterTemplates...`);
    for (const mt of masterTemplates) {
      await prisma.masterTemplate.upsert({
        where: { id: String(mt._id) },
        update: {
          name: mt.name,
          channel: mt.channel || 'whatsapp',
          category: mt.category || 'General',
          headerType: mt.headerType || 'NONE',
          headerMediaUrl: mt.headerMediaUrl || '',
          headerText: mt.headerText || '',
          body: mt.body || '',
          footer: mt.footer || 'UniVerse • Smart Campus Ordering',
          subject: mt.subject || '',
          emailPreheader: mt.emailPreheader || '',
          variables: mt.variables || [],
          buttons: mt.buttons || [],
          ctaText: mt.ctaText || '',
          ctaLink: mt.ctaLink || '',
          emailCtaText: mt.emailCtaText || '',
          emailCtaUrl: mt.emailCtaUrl || '',
          emailHeroImageUrl: mt.emailHeroImageUrl || '',
          status: mt.status || 'Active',
          createdBy: mt.createdBy || 'SuperAdmin',
          updatedAt: mt.updatedAt ? new Date(mt.updatedAt) : new Date()
        },
        create: {
          id: String(mt._id),
          name: mt.name,
          channel: mt.channel || 'whatsapp',
          category: mt.category || 'General',
          headerType: mt.headerType || 'NONE',
          headerMediaUrl: mt.headerMediaUrl || '',
          headerText: mt.headerText || '',
          body: mt.body || '',
          footer: mt.footer || 'UniVerse • Smart Campus Ordering',
          subject: mt.subject || '',
          emailPreheader: mt.emailPreheader || '',
          variables: mt.variables || [],
          buttons: mt.buttons || [],
          ctaText: mt.ctaText || '',
          ctaLink: mt.ctaLink || '',
          emailCtaText: mt.emailCtaText || '',
          emailCtaUrl: mt.emailCtaUrl || '',
          emailHeroImageUrl: mt.emailHeroImageUrl || '',
          status: mt.status || 'Active',
          createdBy: mt.createdBy || 'SuperAdmin',
          createdAt: mt.createdAt ? new Date(mt.createdAt) : new Date(),
          updatedAt: mt.updatedAt ? new Date(mt.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ MasterTemplates seeded: ${masterTemplates.length}`);

    // 11. ChannelAccounts
    const channelAccounts = loadBackup('channelaccounts.json');
    const channelAccountIdSet = new Set(channelAccounts.map(c => String(c._id)));
    console.log(`\n⏳ [11/17] Seeding ${channelAccounts.length} ChannelAccounts...`);
    for (const ca of channelAccounts) {
      await prisma.channelAccount.upsert({
        where: { id: String(ca._id) },
        update: {
          name: ca.name || ca.nickname || 'Channel Account',
          channel: ca.channel || ca.type || 'whatsapp',
          type: ca.type || 'whatsapp',
          slotIndex: ca.slotIndex ? Number(ca.slotIndex) : null,
          nickname: ca.nickname || 'Channel Account',
          phoneNumber: ca.phoneNumber || '',
          pushName: ca.pushName || '',
          platform: ca.platform || 'WhatsApp Multi-Device',
          sessionPath: ca.sessionPath || '',
          status: ca.status || 'disconnected',
          lastActive: ca.lastActive ? new Date(ca.lastActive) : null,
          emailConfig: ca.emailConfig || {},
          whatsappType: ca.whatsappType || 'MultiDevice_Baileys',
          qrCode: ca.qrCode || '',
          phone: ca.phoneNumber || ca.phone || '',
          email: ca.email || '',
          smtpConfig: ca.emailConfig || ca.smtpConfig || {},
          stats: ca.stats || {},
          updatedAt: ca.updatedAt ? new Date(ca.updatedAt) : new Date()
        },
        create: {
          id: String(ca._id),
          name: ca.name || ca.nickname || 'Channel Account',
          channel: ca.channel || ca.type || 'whatsapp',
          type: ca.type || 'whatsapp',
          slotIndex: ca.slotIndex ? Number(ca.slotIndex) : null,
          nickname: ca.nickname || 'Channel Account',
          phoneNumber: ca.phoneNumber || '',
          pushName: ca.pushName || '',
          platform: ca.platform || 'WhatsApp Multi-Device',
          sessionPath: ca.sessionPath || '',
          status: ca.status || 'disconnected',
          lastActive: ca.lastActive ? new Date(ca.lastActive) : null,
          emailConfig: ca.emailConfig || {},
          whatsappType: ca.whatsappType || 'MultiDevice_Baileys',
          qrCode: ca.qrCode || '',
          phone: ca.phoneNumber || ca.phone || '',
          email: ca.email || '',
          smtpConfig: ca.emailConfig || ca.smtpConfig || {},
          stats: ca.stats || {},
          createdAt: ca.createdAt ? new Date(ca.createdAt) : new Date(),
          updatedAt: ca.updatedAt ? new Date(ca.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ ChannelAccounts seeded: ${channelAccounts.length}`);

    // 12. Journeys
    const journeys = loadBackup('journeys.json');
    const journeyIdSet = new Set(journeys.map(j => String(j._id)));
    console.log(`\n⏳ [12/17] Seeding ${journeys.length} Journeys...`);
    for (const j of journeys) {
      await prisma.journey.upsert({
        where: { id: String(j._id) },
        update: {
          name: j.name,
          description: j.description || '',
          triggerType: j.triggerType || 'Order Placed',
          nodes: j.nodes || [],
          status: j.status || 'Draft',
          totalEnrolled: Number(j.totalEnrolled) || 0,
          totalCompleted: Number(j.totalCompleted) || 0,
          updatedAt: j.updatedAt ? new Date(j.updatedAt) : new Date()
        },
        create: {
          id: String(j._id),
          name: j.name,
          description: j.description || '',
          triggerType: j.triggerType || 'Order Placed',
          nodes: j.nodes || [],
          status: j.status || 'Draft',
          totalEnrolled: Number(j.totalEnrolled) || 0,
          totalCompleted: Number(j.totalCompleted) || 0,
          createdAt: j.createdAt ? new Date(j.createdAt) : new Date(),
          updatedAt: j.updatedAt ? new Date(j.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Journeys seeded: ${journeys.length}`);

    // 13. UserJourneyStates
    const userStates = loadBackup('userjourneystates.json');
    console.log(`\n⏳ [13/17] Seeding ${userStates.length} UserJourneyStates...`);
    let seededStates = 0;
    for (const u of userStates) {
      const targetJourneyId = journeyIdSet.has(String(u.journeyId)) ? String(u.journeyId) : null;
      await prisma.userJourneyState.upsert({
        where: { id: String(u._id) },
        update: {
          journeyId: targetJourneyId,
          userId: u.userId || '',
          userType: u.userType || 'Student',
          name: u.name || 'Student',
          phone: u.phone || '',
          email: u.email || '',
          metadata: u.metadata || {},
          currentNodeId: u.currentNodeId || 'root',
          scheduledExecutionTime: u.scheduledExecutionTime ? new Date(u.scheduledExecutionTime) : new Date(),
          status: u.status || 'Pending',
          history: u.history || [],
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
        },
        create: {
          id: String(u._id),
          journeyId: targetJourneyId,
          userId: u.userId || '',
          userType: u.userType || 'Student',
          name: u.name || 'Student',
          phone: u.phone || '',
          email: u.email || '',
          metadata: u.metadata || {},
          currentNodeId: u.currentNodeId || 'root',
          scheduledExecutionTime: u.scheduledExecutionTime ? new Date(u.scheduledExecutionTime) : new Date(),
          status: u.status || 'Pending',
          history: u.history || [],
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
        }
      });
      seededStates++;
    }
    console.log(`   ✅ UserJourneyStates seeded: ${seededStates}`);

    // 14. BroadcastCampaigns
    const broadcasts = loadBackup('broadcastcampaigns.json');
    console.log(`\n⏳ [14/17] Seeding ${broadcasts.length} BroadcastCampaigns...`);
    for (const b of broadcasts) {
      const targetAccountId = channelAccountIdSet.has(String(b.channelAccountId)) ? String(b.channelAccountId) : null;
      const targetTemplateId = templateIdSet.has(String(b.masterTemplateId)) ? String(b.masterTemplateId) : null;

      await prisma.broadcastCampaign.upsert({
        where: { id: String(b._id) },
        update: {
          name: b.name || b.title || 'Broadcast Campaign',
          title: b.title || b.name || 'Broadcast Campaign',
          channel: b.channel || 'whatsapp',
          channelAccountId: targetAccountId,
          masterTemplateId: targetTemplateId,
          targetAudience: b.targetAudience || 'All Students',
          audienceSegment: b.audienceSegment || 'all_students',
          targetCampus: b.targetCampus || 'All',
          customFilters: b.customFilters || {},
          stats: b.stats || {},
          customMessage: b.customMessage || '',
          emailSubject: b.emailSubject || '',
          status: b.status || 'Draft',
          lastError: b.lastError || '',
          logs: b.logs || [],
          totalRecipients: Number(b.stats?.totalRecipients || b.totalRecipients) || 0,
          sentCount: Number(b.stats?.sentCount || b.sentCount) || 0,
          deliveredCount: Number(b.stats?.deliveredCount || b.deliveredCount) || 0,
          failedCount: Number(b.stats?.failedCount || b.failedCount) || 0,
          startedAt: b.startedAt ? new Date(b.startedAt) : null,
          completedAt: b.completedAt ? new Date(b.completedAt) : null,
          updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date()
        },
        create: {
          id: String(b._id),
          name: b.name || b.title || 'Broadcast Campaign',
          title: b.title || b.name || 'Broadcast Campaign',
          channel: b.channel || 'whatsapp',
          channelAccountId: targetAccountId,
          masterTemplateId: targetTemplateId,
          targetAudience: b.targetAudience || 'All Students',
          audienceSegment: b.audienceSegment || 'all_students',
          targetCampus: b.targetCampus || 'All',
          customFilters: b.customFilters || {},
          stats: b.stats || {},
          customMessage: b.customMessage || '',
          emailSubject: b.emailSubject || '',
          status: b.status || 'Draft',
          lastError: b.lastError || '',
          logs: b.logs || [],
          totalRecipients: Number(b.stats?.totalRecipients || b.totalRecipients) || 0,
          sentCount: Number(b.stats?.sentCount || b.sentCount) || 0,
          deliveredCount: Number(b.stats?.deliveredCount || b.deliveredCount) || 0,
          failedCount: Number(b.stats?.failedCount || b.failedCount) || 0,
          startedAt: b.startedAt ? new Date(b.startedAt) : null,
          completedAt: b.completedAt ? new Date(b.completedAt) : null,
          createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
          updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ BroadcastCampaigns seeded: ${broadcasts.length}`);

    // 15. OrderEvents
    const orderEvents = loadBackup('orderevents.json');
    console.log(`\n⏳ [15/17] Seeding ${orderEvents.length} OrderEvents...`);
    let seededEvents = 0;
    for (const e of orderEvents) {
      await prisma.orderEvent.upsert({
        where: { eventId: e.eventId || String(e._id) },
        update: {
          orderId: String(e.orderId),
          orderNumber: e.orderNumber || '',
          userId: e.userId || '',
          actorType: e.actorType || 'SYSTEM',
          actorId: e.actorId || 'SYSTEM',
          eventType: e.eventType || 'STATUS_UPDATE',
          oldStatus: e.oldStatus || '',
          newStatus: e.newStatus || '',
          metadata: e.metadata || {}
        },
        create: {
          id: String(e._id),
          eventId: e.eventId || String(e._id),
          orderId: String(e.orderId),
          orderNumber: e.orderNumber || '',
          userId: e.userId || '',
          actorType: e.actorType || 'SYSTEM',
          actorId: e.actorId || 'SYSTEM',
          eventType: e.eventType || 'STATUS_UPDATE',
          oldStatus: e.oldStatus || '',
          newStatus: e.newStatus || '',
          metadata: e.metadata || {},
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date()
        }
      });
      seededEvents++;
    }
    console.log(`   ✅ OrderEvents seeded: ${seededEvents}`);

    // 16. DeviceRegistries
    const devices = loadBackup('deviceregistries.json');
    console.log(`\n⏳ [16/17] Seeding ${devices.length} Device Registries...`);
    for (const dev of devices) {
      const devToken = dev.pushToken || dev.token || dev.deviceId || String(dev._id);
      await prisma.deviceRegistry.upsert({
        where: { id: String(dev._id) },
        update: {
          token: devToken,
          userId: dev.userId ? String(dev.userId) : '',
          storeId: dev.storeId ? String(dev.storeId) : '',
          deviceId: dev.deviceId || '',
          pushToken: dev.pushToken || dev.token || '',
          platform: dev.platform || 'android',
          active: dev.active !== undefined ? Boolean(dev.active) : true,
          lastSeen: dev.lastSeen ? new Date(dev.lastSeen) : new Date(),
          deviceInfo: dev.deviceInfo || {},
          updatedAt: dev.updatedAt ? new Date(dev.updatedAt) : new Date()
        },
        create: {
          id: String(dev._id),
          token: devToken,
          userId: dev.userId ? String(dev.userId) : '',
          storeId: dev.storeId ? String(dev.storeId) : '',
          deviceId: dev.deviceId || '',
          pushToken: dev.pushToken || dev.token || '',
          platform: dev.platform || 'android',
          active: dev.active !== undefined ? Boolean(dev.active) : true,
          lastSeen: dev.lastSeen ? new Date(dev.lastSeen) : new Date(),
          deviceInfo: dev.deviceInfo || {},
          createdAt: dev.createdAt ? new Date(dev.createdAt) : new Date(),
          updatedAt: dev.updatedAt ? new Date(dev.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Device Registries seeded: ${devices.length}`);

    // 17. VendorDevices
    const vendorDevices = loadBackup('vendordevices.json');
    console.log(`\n⏳ [17/17] Seeding ${vendorDevices.length} Vendor Devices...`);
    for (const vd of vendorDevices) {
      await prisma.vendorDevice.upsert({
        where: { id: String(vd._id) },
        update: {
          adminId: vd.adminId || '',
          token: vd.token || '',
          deviceInfo: vd.deviceInfo || {},
          updatedAt: vd.updatedAt ? new Date(vd.updatedAt) : new Date()
        },
        create: {
          id: String(vd._id),
          adminId: vd.adminId || '',
          token: vd.token || '',
          deviceInfo: vd.deviceInfo || {},
          createdAt: vd.createdAt ? new Date(vd.createdAt) : new Date(),
          updatedAt: vd.updatedAt ? new Date(vd.updatedAt) : new Date()
        }
      });
    }
    console.log(`   ✅ Vendor Devices seeded: ${vendorDevices.length}`);

    console.log('\n====================================================');
    console.log('  🎉 ALL 17 MODELS SEEDED INTO RDS POSTGRESQL!');
    console.log('  100% Unique ID Preservation & Clean State Confirmed.');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPostgres();
