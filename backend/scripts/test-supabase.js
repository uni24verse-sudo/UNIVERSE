require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const urls = [
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  ].filter(Boolean);

  for (const url of urls) {
    console.log('Testing connection...');
    const prisma = new PrismaClient({
      datasources: { db: { url } }
    });

    try {
      const result = await prisma.$queryRawUnsafe('SELECT 1 as test, current_database() as db;');
      console.log('✅ SUPABASE CONNECTION SUCCESSFUL!');
      console.log('Result:', result);
      console.log('Working URL:', url.replace(/:SuperSecurePassword123[^@]+@/, ':***@'));
      await prisma.$disconnect();
      return url;
    } catch (err) {
      console.log('Failed attempt:', err.message.substring(0, 150));
      await prisma.$disconnect();
    }
  }
}

testConnection();
