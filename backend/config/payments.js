module.exports = {
  phonepe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID || 'M123456789', // PLACEHOLDER
    saltKey: process.env.PHONEPE_SALT_KEY || '099db054-d8xx-40xx-85xx-xxx', // PLACEHOLDER
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    env: process.env.PHONEPE_ENV || 'PRODUCTION', // STAGING or PRODUCTION
    callbackUrl: `${process.env.BACKEND_URL}/api/payments/phonepe/callback`
  },
  paytm: {
    merchantId: process.env.PAYTM_MERCHANT_ID || 'YOUR_MID', // PLACEHOLDER
    merchantKey: process.env.PAYTM_MERCHANT_KEY || 'YOUR_KEY', // PLACEHOLDER
    website: process.env.PAYTM_WEBSITE || 'DEFAULT',
    env: process.env.PAYTM_ENV || 'PRODUCTION', // STAGING or PRODUCTION
    callbackUrl: `${process.env.BACKEND_URL}/api/payments/paytm/callback`
  }
};
