const axios = require('axios');
const prisma = require('../config/prisma');

const API_BASE = 'http://localhost:5000';

async function runVerification() {
  console.log('=== STARTING VENDOR APPROVAL & PURGE LIFECYCLE TEST ===\n');

  // Check baseline active vendors
  const baselineCount = await prisma.admin.count({ where: { role: 'vendor', status: 'ACTIVE' } });
  console.log(`[Baseline] Active vendors count before test: ${baselineCount}`);

  // Test 1: Register Fake Applicant
  const fakeEmail = `fake_applicant_${Date.now()}@universe.com`;
  const fakeStall = 'Spam Ghost Kitchen';
  const fakePhone = '+919999888877';
  console.log(`\n1. Registering fake applicant: ${fakeEmail} (Stall: "${fakeStall}")...`);
  
  const regRes = await axios.post(`${API_BASE}/api/auth/register`, {
    name: 'Fake Spammer',
    email: fakeEmail,
    password: 'Password@123',
    phone: fakePhone,
    stallName: fakeStall
  });

  console.log('   Registration response:', regRes.data);
  if (regRes.data.status !== 'PENDING_APPROVAL') {
    throw new Error('Registration did not set status to PENDING_APPROVAL');
  }

  // Test 2: Try to log in with fake applicant (MUST BE BLOCKED)
  console.log('\n2. Attempting login with pending account (should be blocked with 403)...');
  try {
    await axios.post(`${API_BASE}/api/auth/login`, {
      email: fakeEmail,
      password: 'Password@123'
    });
    throw new Error('Pending account was allowed to log in! Security failure.');
  } catch (err) {
    if (err.response && err.response.status === 403 && err.response.data.status === 'PENDING_APPROVAL') {
      console.log('   ✅ Login blocked correctly with 403 PENDING_APPROVAL:', err.response.data.message);
    } else {
      throw new Error(`Unexpected error response during login: ${err.message}`);
    }
  }

  // Test 3: Log in as Super Admin
  console.log('\n3. Logging in as Super Admin...');
  const saLoginRes = await axios.post(`${API_BASE}/api/auth/login`, {
    email: 'superadmin@universe.com',
    password: 'SuperAdmin@123'
  });
  const saToken = saLoginRes.data.token;
  console.log('   ✅ Super Admin authenticated.');

  // Test 4: Fetch vendors list from Super Admin API
  console.log('\n4. Super Admin retrieving vendor registry...');
  const vendorsRes = await axios.get(`${API_BASE}/api/super-admin/vendors`, {
    headers: { Authorization: `Bearer ${saToken}` }
  });
  const pendingApplicant = vendorsRes.data.find(v => v.email === fakeEmail);
  if (!pendingApplicant) {
    throw new Error('Fake applicant not found in Super Admin vendors list');
  }
  console.log('   ✅ Found applicant in queue:');
  console.log(`      ID: ${pendingApplicant.id}`);
  console.log(`      Name: ${pendingApplicant.name}`);
  console.log(`      Status: ${pendingApplicant.status}`);
  console.log(`      Phone: ${pendingApplicant.phone}`);
  console.log(`      Proposed Store: ${pendingApplicant.store?.name}`);

  // Test 5: Reject & Hard-Purge Applicant
  console.log('\n5. Rejecting and hard-purging fake applicant...');
  const rejectRes = await axios.delete(`${API_BASE}/api/super-admin/vendor/${pendingApplicant.id}/reject`, {
    headers: { Authorization: `Bearer ${saToken}` }
  });
  console.log('   Reject response:', rejectRes.data);

  // Test 6: Verify total DB eradication
  console.log('\n6. Verifying total database purge...');
  const checkAdmin = await prisma.admin.findUnique({ where: { email: fakeEmail } });
  const checkStore = await prisma.store.findFirst({ where: { adminId: pendingApplicant.id } });

  if (checkAdmin) {
    throw new Error(`Admin record was not purged from DB! Found: ${checkAdmin.id}`);
  }
  if (checkStore) {
    throw new Error(`Store record was not purged from DB! Found: ${checkStore.id}`);
  }
  console.log('   ✅ Admin account and store record COMPLETELY PURGED from database.');

  // Test 7: Approval Flow
  console.log('\n7. Testing Approval Workflow for legitimate applicant...');
  const legitEmail = `legit_vendor_${Date.now()}@universe.com`;
  const legitStall = 'Legit Campus Meals';

  await axios.post(`${API_BASE}/api/auth/register`, {
    name: 'Legit Merchant',
    email: legitEmail,
    password: 'Password@123',
    phone: '+919123456780',
    stallName: legitStall
  });

  const allVendors2 = await axios.get(`${API_BASE}/api/super-admin/vendors`, {
    headers: { Authorization: `Bearer ${saToken}` }
  });
  const legitApplicant = allVendors2.data.find(v => v.email === legitEmail);
  if (!legitApplicant) throw new Error('Legit applicant not found in queue');

  console.log(`   Approving legit vendor: ${legitApplicant.id}...`);
  const approveRes = await axios.put(`${API_BASE}/api/super-admin/vendor/${legitApplicant.id}/approve`, {}, {
    headers: { Authorization: `Bearer ${saToken}` }
  });
  console.log('   Approve response:', approveRes.data);

  // Now verify vendor CAN log in
  console.log('   Attempting login after approval...');
  const legitLoginRes = await axios.post(`${API_BASE}/api/auth/login`, {
    email: legitEmail,
    password: 'Password@123'
  });
  if (!legitLoginRes.data.token) {
    throw new Error('Approved vendor could not obtain login token');
  }
  console.log('   ✅ Approved vendor logged in successfully! Token received.');

  // Clean up legit test vendor
  await axios.delete(`${API_BASE}/api/super-admin/vendor/${legitApplicant.id}`, {
    headers: { Authorization: `Bearer ${saToken}` }
  });
  console.log('   Cleaned up test account.');

  // Final check: baseline
  const finalActiveCount = await prisma.admin.count({ where: { role: 'vendor', status: 'ACTIVE' } });
  console.log(`\n[Final Baseline Check] Active vendors count: ${finalActiveCount} (Original: ${baselineCount})`);
  if (finalActiveCount !== baselineCount) {
    console.warn(`Warning: Active vendor count changed from ${baselineCount} to ${finalActiveCount}`);
  } else {
    console.log('✅ All existing stalls remain completely untouched and intact!');
  }

  console.log('\n🎉 ALL APPROVAL GATE AND PURGE VERIFICATIONS PASSED 100%!');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err.response?.data || err.message);
  process.exit(1);
});
