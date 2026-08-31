const axios = require('axios');

const appId = "cec6a596-a353-47ac-af3b-f007f5ceeb54".trim();
const apiKey = "os_v2_app_z3dklfvdknd2zlz36ad7ltxlkqlbv6y52xturye4mpaudrkqh6dcgbcbkelefxuxer7r3x7qdziyavd2uwtezkf526fkbz7l3wznbli".trim();

const testAuth = async (prefix, useBase64 = false) => {
  let authValue = apiKey;
  if (useBase64) {
    authValue = Buffer.from(`${apiKey}:`).toString('base64');
  }
  
  const headerValue = prefix ? `${prefix} ${authValue}` : authValue;
  console.log(`\n--- Testing Header: "${headerValue.substring(0, 20)}..." ---`);
  
  try {
    const response = await axios.post('https://api.onesignal.com/notifications', {
      app_id: appId,
      include_external_user_ids: ["test_user"],
      contents: { en: `Diagnostic ${prefix}` }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': headerValue
      }
    });
    console.log(`✅ Success:`, response.data);
  } catch (error) {
    console.log(`❌ Failed:`, error.response?.status, error.response?.data || error.message);
  }
};

const runTests = async () => {
  console.log('Starting DEEP OneSignal V2 Auth Diagnostics...');
  
  await testAuth('Key');
  await testAuth('Basic');
  await testAuth('Basic', true); // base64 encoded
  await testAuth('Token');
  await testAuth('Bearer');
  await testAuth('');
  
  console.log('\n--- Testing LEGACY Endpoint with "Basic" (Plain) ---');
  try {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', {
      app_id: appId,
      include_external_user_ids: ["test_user"],
      contents: { en: "Legacy Plain Test" }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      }
    });
    console.log(`✅ Success (Legacy):`, response.data);
  } catch (error) {
    console.log(`❌ Failed (Legacy):`, error.response?.status, error.response?.data || error.message);
  }
};

runTests();
