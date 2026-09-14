const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  const email = 'superadmin@universe.com';
  const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);
  const admin = await prisma.admin.upsert({
    where: { email },
    create: {
      id: '66bccd049fcdc3a0771d6614',
      name: 'Super Admin (UAT)',
      email,
      password: hashedPassword,
      role: 'superadmin',
      status: 'active'
    },
    update: {
      password: hashedPassword,
      role: 'superadmin',
      status: 'active'
    }
  });
  console.log('✅ Updated UAT SuperAdmin successfully:', admin.email, admin.id);
}

main()
  .catch(err => console.error('Error:', err))
  .finally(() => prisma.$disconnect());
