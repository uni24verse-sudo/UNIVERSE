module.exports = {
  cashfree: {
    appId: process.env.CASHFREE_APP_ID || '', 
    secretKey: process.env.CASHFREE_SECRET_KEY || '', 
    env: process.env.CASHFREE_ENV || 'SANDBOX' // SANDBOX or PRODUCTION
  }
};
