const prisma = require('../config/prisma');

async function checkAnalytics() {
  const [allOrders, allStores] = await Promise.all([
    prisma.order.findMany({ include: { store: true } }),
    prisma.store.findMany()
  ]);

  const completedOrders = allOrders.filter(o => o.status === 'Completed');
  const totalRevenue = completedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  let totalPlatformProfit = 0;
  const now = new Date();

  for (const store of allStores) {
    const storeCompleted = completedOrders.filter(o => o.storeId === store.id);
    const trialEnd = store.trialEndDate ? new Date(store.trialEndDate) : null;
    const isTrialOver = store.isTrialStarted && trialEnd && now > trialEnd;

    if (isTrialOver && trialEnd) {
      const postTrial = storeCompleted.filter(o => new Date(o.createdAt) > trialEnd);
      totalPlatformProfit += postTrial.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 0.03;
    }

    const storeCancelled = allOrders.filter(o => 
      o.storeId === store.id && 
      o.status === 'Cancelled' && 
      o.paymentStatus === 'Confirmed'
    );
    totalPlatformProfit += storeCancelled.reduce((sum, o) => sum + (o.totalAmount || 0), 0) * 0.04;
  }

  const pgGatewayFee = Math.round(totalRevenue * 0.02);
  const platformCommission = Math.round(totalPlatformProfit);
  const vendorShare = Math.max(0, totalRevenue - pgGatewayFee - platformCommission);

  console.log('=== REALTIME ANALYTICS VERIFICATION ===');
  console.log(`Total GMV: ₹${totalRevenue}`);
  console.log(`UniVerse Net Take: ₹${platformCommission}`);
  console.log(`Vendor Payout Share: ₹${vendorShare}`);
  console.log(`Gateway Fee (2%): ₹${pgGatewayFee}`);
  console.log(`Sum Check: ${vendorShare + pgGatewayFee + platformCommission} === ${totalRevenue}`);

  const refunds = await prisma.refund.findMany();
  const refundSum = refunds.reduce((s, r) => s + r.amount, 0);
  console.log(`\nRefunds Count: ${refunds.length}`);
  console.log(`Total Refunded Amount in RDS: ₹${refundSum}`);

  const customers = await prisma.customer.findMany({ select: { metrics: true } });
  const custRefundSum = customers.reduce((s, c) => s + (c.metrics?.totalRefunded || 0), 0);
  console.log(`Total Customer 360 Refunded: ₹${custRefundSum}`);
}

checkAnalytics().catch(console.error).finally(() => prisma.$disconnect());
