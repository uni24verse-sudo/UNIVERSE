require('dotenv').config();
const prisma = require('../config/prisma');

async function check() {
  const admins = await prisma.admin.findMany({ select: { id: true, name: true, email: true, role: true } });
  console.log('Admins count:', admins.length, admins);
}
check().catch(console.error).finally(() => prisma.$disconnect());
