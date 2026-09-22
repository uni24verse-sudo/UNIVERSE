const axios = require('axios');
const prisma = require('../config/prisma');

async function testSharePreviews() {
  console.log('=== TESTING DYNAMIC OPEN GRAPH PREVIEWS FOR DISH & STALL ===\n');

  // 1. Find a store with products in DB
  const stores = await prisma.store.findMany();
  const storeWithProducts = stores.find(s => Array.isArray(s.products) && s.products.length > 0);

  if (!storeWithProducts) {
    throw new Error('No store with products found in database');
  }

  const shortId = storeWithProducts.id.slice(0, 8);
  const sampleProduct = storeWithProducts.products[0];
  console.log(`Testing with Store: "${storeWithProducts.name}" (ID: ${storeWithProducts.id}, Short: ${shortId})`);
  console.log(`Testing with Product: "${sampleProduct.name}" (Price: ₹${sampleProduct.price})\n`);

  // 2. Test Food Dish Sharing via /d/:storeId?dish=...
  console.log('1. Testing Food Dish Share: GET /d/' + shortId + '?dish=' + encodeURIComponent(sampleProduct.name));
  const dishRes = await axios.get(`http://localhost:5000/d/${shortId}?dish=${encodeURIComponent(sampleProduct.name)}`, {
    headers: { 'User-Agent': 'WhatsApp/2.21.12.21 A' }
  });

  const dishHtml = dishRes.data;
  console.log('   Status Code:', dishRes.status);

  // Extract meta tags
  const ogTitleMatch = dishHtml.match(/<meta property="og:title" content="([^"]+)"/);
  const ogImageMatch = dishHtml.match(/<meta property="og:image" content="([^"]+)"/);
  const ogDescMatch = dishHtml.match(/<meta property="og:description" content="([^"]+)"/);

  console.log('   ✅ og:title ->', ogTitleMatch ? ogTitleMatch[1] : 'NOT FOUND');
  console.log('   ✅ og:image ->', ogImageMatch ? ogImageMatch[1] : 'NOT FOUND');
  console.log('   ✅ og:desc  ->', ogDescMatch ? ogDescMatch[1] : 'NOT FOUND');

  if (!ogTitleMatch || !ogTitleMatch[1].includes(sampleProduct.name)) {
    throw new Error('og:title does not contain dish name');
  }
  if (!ogImageMatch) {
    throw new Error('og:image is missing');
  }
  if (sampleProduct.image && ogImageMatch[1] !== sampleProduct.image) {
    throw new Error(`og:image should be food image (${sampleProduct.image}) but got ${ogImageMatch[1]}`);
  }
  console.log('   ✅ Food Dish Open Graph verification PASSED!\n');

  // 3. Test Stall Sharing via /s/:storeId
  console.log('2. Testing Stall Share: GET /s/' + shortId);
  const stallRes = await axios.get(`http://localhost:5000/s/${shortId}`, {
    headers: { 'User-Agent': 'WhatsApp/2.21.12.21 A' }
  });

  const stallHtml = stallRes.data;
  console.log('   Status Code:', stallRes.status);

  const stallTitleMatch = stallHtml.match(/<meta property="og:title" content="([^"]+)"/);
  const stallImageMatch = stallHtml.match(/<meta property="og:image" content="([^"]+)"/);
  const stallDescMatch = stallHtml.match(/<meta property="og:description" content="([^"]+)"/);

  console.log('   ✅ og:title ->', stallTitleMatch ? stallTitleMatch[1] : 'NOT FOUND');
  console.log('   ✅ og:image ->', stallImageMatch ? stallImageMatch[1] : 'NOT FOUND');
  console.log('   ✅ og:desc  ->', stallDescMatch ? stallDescMatch[1] : 'NOT FOUND');

  if (!stallTitleMatch || !stallTitleMatch[1].includes(storeWithProducts.name)) {
    throw new Error('og:title does not contain stall name');
  }
  if (storeWithProducts.image && stallImageMatch[1] !== storeWithProducts.image) {
    throw new Error(`og:image should be stall image (${storeWithProducts.image}) but got ${stallImageMatch[1]}`);
  }
  console.log('   ✅ Stall Open Graph verification PASSED!\n');

  // 4. Test Store Lookup via short prefix in API
  console.log('3. Testing Store Repository lookup with 8-char short ID: /api/store/' + shortId);
  const apiStoreRes = await axios.get(`http://localhost:5000/api/store/${shortId}`);
  if (apiStoreRes.data.id !== storeWithProducts.id) {
    throw new Error(`Store API returned wrong store ID for short prefix: ${apiStoreRes.data.id}`);
  }
  console.log(`   ✅ API resolved short ID "${shortId}" to full store "${apiStoreRes.data.name}" (${apiStoreRes.data.id})\n`);

  console.log('🎉 ALL DYNAMIC FOOD & STALL SHARE PREVIEW TESTS PASSED 100%!');
  process.exit(0);
}

testSharePreviews().catch(err => {
  console.error('❌ TEST FAILED:', err.message);
  process.exit(1);
});
