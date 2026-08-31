const PaytmChecksum = require('paytmchecksum');
const fs = require('fs');

async function generate() {
    const paytmParamsBody = {
      requestType: "Payment",
      mid: "uKPGEK91260219944393",
      websiteName: "WEBSTAGING",
      orderId: "TEST_123",
      callbackUrl: "https://webhook.site/test",
      txnAmount: {
        value: "10.00",
        currency: "INR",
      },
      userInfo: {
        custId: "CUST_123",
      }
    };

    const bodyString = JSON.stringify(paytmParamsBody);
    const checksum = await PaytmChecksum.generateSignature(bodyString, "ZsQm4guFt@1Oos75");
    
    const payload = {
      body: paytmParamsBody,
      head: { signature: checksum }
    };
    
    console.log(`\n\n--- FOR POSTMAN ---`);
    console.log(`URL: https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction?mid=${paytmParamsBody.mid}&orderId=${paytmParamsBody.orderId}`);
    console.log(`METHOD: POST`);
    console.log(`HEADERS: Content-Type: application/json`);
    console.log(`BODY (raw JSON):\n${JSON.stringify(payload, null, 2)}`);
    console.log(`-------------------\n\n`);
    
    try {
      const axios = require('axios');
      const response = await axios.post(`https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction?mid=${paytmParamsBody.mid}&orderId=${paytmParamsBody.orderId}`, payload);
      fs.writeFileSync('paytm_response.json', JSON.stringify(response.data, null, 2));
    } catch (e) {}
}

generate();
