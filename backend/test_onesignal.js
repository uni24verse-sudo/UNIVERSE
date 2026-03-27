const axios = require('axios');

const appId = "cec6a596-a353-47ac-af3b-f007f5ceeb54";
const apiKey = "os_v2_app_z3dklfvdknd2zlz36ad7ltxlksbjnukozmzu74ft3laggyikge7uogijxiofoo7m7owxcrwbgqtclhsnro2m7f66pyhjou2l2dlzrti";

const testAuth = async (prefix) => {
  console.log(`\n--- Testing Auth Prefix: "${prefix}" ---`);
  try {
    const response = await axios.post('https://api.onesignal.com/notifications', {
      app_id: appId,
      include_external_user_ids: ["test_user"],
      contents: { en: "Test Diagnostic Message" }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': prefix ? `${prefix} ${apiKey}` : apiKey
      }
    });
    console.log(`✅ Success:`, response.data);
  } catch (error) {
    console.log(`❌ Failed:`, error.response?.status, error.response?.data || error.message);
  }
};

const runTests = async () => {
  console.log('Starting OneSignal V2 Auth Diagnostics...');
  console.log('Target App ID:', appId);
  
  await testAuth('Key');
  await testAuth('Basic');
  await testAuth('Bearer');
  await testAuth('');
  
  // Also try the legacy endpoint just in case
  console.log('\n--- Testing LEGACY Endpoint with "Key" prefix ---');
  try {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', {
      app_id: appId,
      include_external_user_ids: ["test_user"],
      contents: { en: "Legacy Test" }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      }
    });
    console.log(`✅ Success (Legacy):`, response.data);
  } catch (error) {
    console.log(`❌ Failed (Legacy):`, error.response?.status, error.response?.data || error.message);
  }
};

runTests();
