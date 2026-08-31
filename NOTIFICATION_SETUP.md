# FCM Push Notification System

This document explains the complete Firebase Cloud Messaging (FCM) implementation for the UniVerse food ordering app.

## 🚀 Features Implemented

### ✅ Background Notifications
- Works when app is minimized, screen is off, or browser is closed
- Service worker handles push notifications even when app is not active
- Custom order bell sound plays in background
- Notifications appear in system notification center

### ✅ Cross-Platform Support
- Android: Full support with vibration and sound
- iOS: Push notifications with custom sounds
- Desktop: Browser notifications with fallback support

### ✅ Smart Token Management
- Prevents spam notifications by caching FCM tokens
- Automatically removes invalid tokens
- Single initialization point prevents duplicate subscriptions

## 📁 Files Modified/Created

### Frontend
- `src/firebase.js` - FCM initialization and token management
- `public/firebase-messaging-sw.js` - Service worker for background notifications
- `src/utils/notifications.js` - Updated notification manager with FCM integration
- `src/pages/Cart.jsx` - Fixed React Hooks violations
- `src/pages/OrderTracker.jsx` - Added safe OneSignal usage
- `index.html` - Conditional OneSignal loading

### Backend
- `services/notificationService.js` - Centralized FCM notification service
- `routes/fcm.js` - FCM token management endpoints
- `models/Store.js` - Added FCM tokens array
- `routes/orders.js` - Integrated FCM notifications for new orders
- `server.js` - Added FCM routes

## 🔧 Setup Instructions

### 1. Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Cloud Messaging
4. Download service account key and place in `backend/config/firebase-key.json`
5. Get VAPID key from Project Settings > Cloud Messaging

### 2. Frontend Setup
```javascript
// Import and initialize FCM
import { initializeFCM } from './firebase.js';

// Initialize when app loads
await initializeFCM();
```

### 3. Backend Setup
```javascript
// Send notification to vendor
await notificationService.sendNewOrderNotification(fcmToken, orderData);
```

## 📱 How It Works

1. **App Initialization**
   - User opens app → FCM token generated
   - Token saved to server and localStorage
   - Service worker registered for background handling

2. **New Order Placed**
   - Backend sends FCM push notification
   - Service worker receives push even if app is closed
   - Notification shows with custom sound and vibration

3. **User Interaction**
   - Clicking notification opens app to order details
   - Quick actions (Accept/View) available
   - Proper deep linking to vendor dashboard

## 🔊 Custom Sound Configuration

### Order Bell Sound
- URL: `https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3`
- Vibration: `[200, 100, 200, 100, 200]`
- Works on all platforms

### Sound File Structure
```javascript
// Service Worker
sound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"

// Android Specific
android: {
  notification: {
    sound: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
  }
}

// iOS Specific  
apns: {
  payload: {
    aps: {
      sound: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
    }
  }
}
```

## 🛠 API Endpoints

### Save FCM Token
```http
POST /api/fcm/save-fcm-token
Content-Type: application/json

{
  "token": "fcm_token_here",
  "userId": "user_id",
  "userType": "vendor"
}
```

### Remove FCM Token
```http
POST /api/fcm/remove-fcm-token
Content-Type: application/json

{
  "token": "fcm_token_here",
  "userId": "user_id"
}
```

## 🔒 Security Notes

- Firebase service account key is in `.gitignore`
- Never commit sensitive credentials to version control
- Tokens are validated and cleaned up automatically
- Proper authentication required for all FCM endpoints

## 🐛 Troubleshooting

### Notifications Not Working
1. Check browser notification permissions
2. Verify Firebase configuration
3. Check service worker registration
4. Ensure FCM token is saved to server

### Background Issues
1. Verify service worker is properly registered
2. Check browser background sync permissions
3. Test with different browsers (Chrome recommended)

### Sound Not Playing
1. Check browser audio permissions
2. Test sound URL accessibility
3. Verify device volume settings

## 📊 Performance

- **Token Management**: Cached to prevent spam requests
- **Invalid Token Cleanup**: Automatic removal of expired tokens
- **Batch Processing**: Multiple tokens supported per vendor
- **Fallback Support**: Basic notifications if FCM fails

## 🎯 Best Practices

1. **Always** handle notification permissions gracefully
2. **Never** request tokens repeatedly
3. **Always** provide fallback mechanisms
4. **Test** on real devices, not just emulators
5. **Monitor** FCM delivery rates and errors

## 🔮 Future Enhancements

- Location-based notifications
- Rich media notifications (images, videos)
- Notification scheduling
- Analytics on notification engagement
- A/B testing for notification content

---

## 📞 Support

For issues or questions about the notification system:
1. Check browser console for errors
2. Verify Firebase console configuration
3. Review network requests in dev tools
4. Check server logs for FCM errors

This implementation follows Firebase best practices and provides a robust, scalable notification system for professional food ordering applications.
