require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prodDbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
const uatDbUrl = process.env.UAT_DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

const prod = new PrismaClient({ datasources: { db: { url: prodDbUrl } } });
const uat = new PrismaClient({ datasources: { db: { url: uatDbUrl } } });

async function syncAll() {
  console.log('====================================================');
  console.log('  STARTING FULL PRODUCTION TO SUPABASE DATA CLONE   ');
  console.log('====================================================');

  // 1. Locations
  const locations = await prod.location.findMany();
  console.log(`\n[1/17] Locations (${locations.length})...`);
  for (const item of locations) {
    await uat.location.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
  console.log('  ✅ Locations synced.');

  // 2. Admins
  const admins = await prod.admin.findMany();
  console.log(`\n[2/17] Admins (${admins.length})...`);
  for (const item of admins) {
    await uat.admin.upsert({
      where: { email: item.email },
      create: item,
      update: {
        name: item.name,
        password: item.password,
        phone: item.phone,
        role: item.role,
        status: item.status,
        storeId: item.storeId,
        vendorId: item.vendorId,
        whatsappNumber: item.whatsappNumber,
        whatsappApiKey: item.whatsappApiKey
      }
    });
  }
  console.log('  ✅ Admins synced.');

  // 3. Stores
  const stores = await prod.store.findMany();
  console.log(`\n[3/17] Stores (${stores.length})...`);
  for (const item of stores) {
    const { orders, settlements, admin, location, ...storeData } = item;
    await uat.store.upsert({
      where: { id: storeData.id },
      create: storeData,
      update: storeData
    });
  }
  console.log('  ✅ Stores synced.');

  // 4. Customers
  const customers = await prod.customer.findMany();
  console.log(`\n[4/17] Customers (${customers.length})...`);
  for (const item of customers) {
    await uat.customer.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
  console.log('  ✅ Customers synced.');

  // 5. Orders
  const orders = await prod.order.findMany();
  console.log(`\n[5/17] Orders (${orders.length})...`);
  for (const item of orders) {
    const { refunds, store, ...orderData } = item;
    await uat.order.upsert({
      where: { id: orderData.id },
      create: orderData,
      update: orderData
    });
  }
  console.log('  ✅ Orders synced.');

  // 6. Payments
  const payments = await prod.payment.findMany();
  console.log(`\n[6/17] Payments (${payments.length})...`);
  for (const item of payments) {
    await uat.payment.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
  console.log('  ✅ Payments synced.');

  // 7. Refunds
  const refunds = await prod.refund.findMany();
  console.log(`\n[7/17] Refunds (${refunds.length})...`);
  for (const item of refunds) {
    const { order, ...refundData } = item;
    await uat.refund.upsert({
      where: { id: refundData.id },
      create: refundData,
      update: refundData
    });
  }
  console.log('  ✅ Refunds synced.');

  // 8. Settlements
  const settlements = await prod.settlement.findMany();
  console.log(`\n[8/17] Settlements (${settlements.length})...`);
  for (const item of settlements) {
    const { store, admin, ...settlementData } = item;
    await uat.settlement.upsert({
      where: { id: settlementData.id },
      create: settlementData,
      update: settlementData
    });
  }
  console.log('  ✅ Settlements synced.');

  // 9. OrderEvents
  const events = await prod.orderEvent.findMany();
  console.log(`\n[9/17] OrderEvents (${events.length})...`);
  for (const item of events) {
    await uat.orderEvent.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
  console.log('  ✅ OrderEvents synced.');

  // 10. ChannelAccounts
  const channels = await prod.channelAccount.findMany();
  console.log(`\n[10/17] ChannelAccounts (${channels.length})...`);
  for (const item of channels) {
    const { broadcasts, ...channelData } = item;
    await uat.channelAccount.upsert({
      where: { id: channelData.id },
      create: channelData,
      update: channelData
    });
  }
  console.log('  ✅ ChannelAccounts synced.');

  // 11. MasterTemplates
  const templates = await prod.masterTemplate.findMany();
  console.log(`\n[11/17] MasterTemplates (${templates.length})...`);
  for (const item of templates) {
    const { broadcasts, ...tmplData } = item;
    await uat.masterTemplate.upsert({
      where: { id: tmplData.id },
      create: tmplData,
      update: tmplData
    });
  }
  console.log('  ✅ MasterTemplates synced.');

  // 12. Journeys
  const journeys = await prod.journey.findMany();
  console.log(`\n[12/17] Journeys (${journeys.length})...`);
  for (const item of journeys) {
    const { userStates, ...journeyData } = item;
    await uat.journey.upsert({
      where: { id: journeyData.id },
      create: journeyData,
      update: journeyData
    });
  }
  console.log('  ✅ Journeys synced.');

  // 13. UserJourneyStates
  const states = await prod.userJourneyState.findMany();
  console.log(`\n[13/17] UserJourneyStates (${states.length})...`);
  for (const item of states) {
    const { journey, ...stateData } = item;
    await uat.userJourneyState.upsert({
      where: { id: stateData.id },
      create: stateData,
      update: stateData
    });
  }
  console.log('  ✅ UserJourneyStates synced.');

  // 14. BroadcastCampaigns
  const broadcasts = await prod.broadcastCampaign.findMany();
  console.log(`\n[14/17] BroadcastCampaigns (${broadcasts.length})...`);
  for (const item of broadcasts) {
    const { channelAccount, template, ...bcData } = item;
    await uat.broadcastCampaign.upsert({
      where: { id: bcData.id },
      create: bcData,
      update: bcData
    });
  }
  console.log('  ✅ BroadcastCampaigns synced.');

  // 15. DeviceRegistries
  const devices = await prod.deviceRegistry.findMany();
  console.log(`\n[15/17] DeviceRegistries (${devices.length})...`);
  for (const item of devices) {
    await uat.deviceRegistry.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
  console.log('  ✅ DeviceRegistries synced.');

  // 16. RefundConfigs
  const refundConfigs = await prod.refundConfig.findMany();
  console.log(`\n[16/17] RefundConfigs (${refundConfigs.length})...`);
  for (const item of refundConfigs) {
    await uat.refundConfig.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
  console.log('  ✅ RefundConfigs synced.');

  // 17. WebhookEvents
  const webhooks = await prod.webhookEvent.findMany();
  console.log(`\n[17/17] WebhookEvents (${webhooks.length})...`);
  for (const item of webhooks) {
    await uat.webhookEvent.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
  console.log('  ✅ WebhookEvents synced.');

  console.log('\n====================================================');
  console.log('  🎉 100% OF PRODUCTION DATA SUCCESSFULLY CLONED!  ');
  console.log('====================================================');
}

syncAll()
  .catch(err => console.error('Migration Error:', err))
  .finally(async () => {
    await prod.$disconnect();
    await uat.$disconnect();
  });
