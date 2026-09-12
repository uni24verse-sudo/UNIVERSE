const prisma = require('../config/prisma');

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      status: true,
      storeId: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total orders in RDS PostgreSQL: ${orders.length}`);
  console.log('Sample orders:');
  orders.slice(0, 10).forEach(o => {
    console.log(`- Token ${o.tokenNumber} | Amount: ₹${o.totalAmount} | Status: ${o.status} | Store: ${o.storeId} | Date: ${o.createdAt}`);
  });

  const dates = orders.map(o => o.createdAt.toISOString().slice(0, 10));
  const dateCounts = {};
  dates.forEach(d => { dateCounts[d] = (dateCounts[d] || 0) + 1; });
  console.log('\nOrder count by date in RDS PostgreSQL:');
  console.log(dateCounts);

  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      phoneNumber: true,
      name: true,
      metrics: true
    }
  });
  console.log(`\nTotal customers in RDS PostgreSQL: ${customers.length}`);
  let sumSpent = 0;
  let sumOrders = 0;
  let sumRefunded = 0;
  customers.forEach(c => {
    sumSpent += (c.metrics?.totalSpent || 0);
    sumOrders += (c.metrics?.totalOrders || 0);
    sumRefunded += (c.metrics?.totalRefunded || 0);
  });
  console.log(`Customer metrics sum: Orders=${sumOrders}, Spent=₹${sumSpent}, Refunded=₹${sumRefunded}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
