const prisma = require('../config/prisma');

async function run() {
  const orders = await prisma.order.findMany({
    select: { id: true, createdAt: true, status: true, totalAmount: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log('Total orders count:', orders.length);
  const byDate = {};
  orders.forEach(o => {
    const d = new Date(o.createdAt).toISOString().split('T')[0];
    if (!byDate[d]) byDate[d] = { count: 0, completed: 0, revenue: 0 };
    byDate[d].count += 1;
    if (o.status === 'Completed') {
      byDate[d].completed += 1;
      byDate[d].revenue += (o.totalAmount || 0);
    }
  });
  console.log('Orders by Date:', JSON.stringify(byDate, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
