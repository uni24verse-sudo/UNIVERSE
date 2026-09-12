const prisma = require('../config/prisma');

async function auditStoresAndOrders() {
  console.log('=== COMPLETE STORE & VENDOR AUDIT ===');
  const stores = await prisma.store.findMany({
    include: {
      orders: true,
      admin: true
    }
  });

  console.log(`Total stores: ${stores.length}`);
  
  stores.forEach(s => {
    const orders = s.orders || [];
    const completed = orders.filter(o => o.status === 'Completed');
    const cancelled = orders.filter(o => o.status === 'Cancelled' && o.paymentStatus === 'Confirmed');
    const compRev = completed.reduce((sum, o) => sum + o.totalAmount, 0);
    const cancRev = cancelled.reduce((sum, o) => sum + o.totalAmount, 0);

    if (orders.length > 0) {
      console.log(`\nStore: "${s.name}" (ID: ${s.id})`);
      console.log(`  - Admin: ${s.admin?.name} (${s.admin?.email})`);
      console.log(`  - isTrialStarted: ${s.isTrialStarted}`);
      console.log(`  - trialStartDate: ${s.trialStartDate}`);
      console.log(`  - trialEndDate: ${s.trialEndDate}`);
      console.log(`  - Total Orders: ${orders.length} (Completed: ${completed.length}, Cancelled: ${cancelled.length})`);
      console.log(`  - Completed GMV: ₹${compRev}`);
      console.log(`  - Cancelled Confirmed Volume: ₹${cancRev}`);
      orders.forEach(o => {
        console.log(`    * Order #${o.orderNumber}: ₹${o.totalAmount} | Status: ${o.status} | PayStatus: ${o.paymentStatus} | Date: ${o.createdAt} | Customer: ${o.customerName} (${o.customerPhone})`);
      });
    }
  });
}

auditStoresAndOrders().catch(console.error).finally(() => prisma.$disconnect());
