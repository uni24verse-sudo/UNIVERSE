const prisma = require('../config/prisma');

async function check() {
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stores'
      ORDER BY column_name
    `);
    console.log('Stores columns:', cols.map(c => c.column_name));
    
    // Check if offers exists
    const hasOffers = cols.some(c => c.column_name === 'offers');
    console.log('Has offers column?', hasOffers);
  } catch (err) {
    console.error('Error querying columns:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
