# OneSignal Setup Instructions for Universe Project

## 🚨 IMPORTANT: Action Required

You've provided the OneSignal REST API Key, but you still need to provide the **App ID**. The App ID and REST API Key are different:

- **App ID**: A public UUID (like `12345678-1234-1234-1234-123456789abc`)
- **REST API Key**: A secret key starting with `os_v2_app_` (which you've provided)

## 🔧 Setup Steps

### 1. Get Your OneSignal App ID

1. Go to [OneSignal Dashboard](https://dashboard.onesignal.com)
2. Select your app
3. Go to **Settings > Keys & IDs**
4. Copy the **App ID** (it's a UUID format, not starting with `os_v2_`)

### 2. Update Configuration Files

Replace `YOUR_APP_ID_HERE` in these files with your actual App ID:

#### Backend (.env)
```bash
ONESIGNAL_APP_ID=your-actual-app-id-here
ONESIGNAL_REST_API_KEY=os_v2_app_z3dklfvdknd2zlz36ad7ltxlkq4tpe7ibemelnevdmawgph4pgbgvq33i65hmusfr4m7vbkdlfw5phlcevgt3h4zmnwse5mb6ldurwi
```

#### Frontend (src/components/OneSignalInit.jsx)
```javascript
await OneSignal.init({
  appId: "your-actual-app-id-here",
  allowLocalhostAsSecureOrigin: true,
  notifyButton: { enable: true },
});
```

## 📱 Notification Flow Implementation

### ✅ What's Already Implemented

1. **New Order Notifications** (Cash Orders)
   - Triggered immediately when customer places cash order
   - Notification: "🍔 New Order Received! - Order #1234 - ₹299"

2. **Payment Verification Requests** (UPI Orders)
   - Triggered when customer requests payment verification
   - Notification: "🔔 Payment Verification Requested! - Customer requested verification for Order #1234 - ₹299"

3. **UPI Payment Confirmations**
   - Triggered when vendor verifies UPI payment
   - Notification: "💰 UPI Payment Confirmed! - Order #1234 - ₹299 (UPI payment verified)"

4. **PhonePe Payment Notifications**
   - Triggered automatically via PhonePe webhook
   - Notification: "💰 New Paid Order! - Order #1234 - ₹299 (Paid via PhonePe)"

5. **Paytm Payment Notifications**
   - Triggered automatically via Paytm webhook
   - Notification: "💰 New Paid Order! - Order #1234 - ₹299 (Paid via Paytm)"

### 🔄 Complete Order Flow

#### Cash Order Flow
1. Customer places order → **Immediate notification** to vendor
2. Vendor sees order in dashboard with "Pending" status
3. Vendor can accept/reject order

#### UPI Order Flow
1. Customer places order → Shows "Payment Pending" to customer
2. Customer pays via UPI → Shows "Process Pending" 
3. Customer requests verification → **Notification** to vendor
4. Vendor verifies payment → **Confirmation notification** to vendor
5. Order becomes visible to vendor for processing

#### PhonePe/Paytm Order Flow
1. Customer places order → Redirects to payment gateway
2. Payment completes → **Automatic notification** to vendor via webhook
3. Order becomes visible to vendor for processing

## 🧪 Testing the System

### 1. Start Backend Server
```bash
cd backend
npm start
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Notifications
```bash
cd backend
node test_notifications_with_env.js
```

### 4. Real Testing Steps
1. Login as vendor in frontend
2. Grant notification permissions in browser
3. Place test orders as customer
4. Verify notifications appear

## 🔍 Troubleshooting

### Notifications Not Working?
1. **Check App ID**: Make sure you replaced `YOUR_APP_ID_HERE` with actual UUID
2. **Browser Permissions**: Allow notifications in browser settings
3. **Vendor Login**: Ensure vendor is logged in to get OneSignal subscription
4. **Console Errors**: Check browser console for OneSignal errors
5. **Network Tab**: Check for failed API requests to OneSignal

### Common Issues
- **"All included players are not subscribed"**: Vendor needs to login and grant permission
- **"Failed to parse app_id"**: App ID is incorrect format (should be UUID, not starting with `os_v2_`)
- **No notifications**: Check browser notification permissions

## 📊 Files Modified

### Backend
- `backend/.env` - OneSignal configuration
- `backend/services/notificationService.js` - Already implemented
- `backend/routes/orders.js` - Enhanced with notifications
- `backend/routes/payments.js` - Already has payment notifications

### Frontend
- `frontend/src/components/OneSignalInit.jsx` - Updated App ID placeholder
- `frontend/public/OneSignalSDKWorker.js` - Service worker already configured

## 🎯 Next Steps

1. **Get your OneSignal App ID** from the dashboard
2. **Update the configuration files** with the correct App ID
3. **Test the notification system** with real orders
4. **Monitor vendor notifications** to ensure they receive all order types

The notification system is fully implemented and ready to work once you provide the correct App ID!
