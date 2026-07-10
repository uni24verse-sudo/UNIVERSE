# 🍽️ UniVerse Food Ordering Web App

A modern, production-ready food ordering platform with **real-time Firebase Cloud Messaging (FCM) notifications**, background support, vendor order alerts, and cross-platform compatibility.

---

# ✨ Features

## 🔔 Background Push Notifications

- Receive notifications even when:
  - App is minimized
  - Browser is closed
  - Device screen is locked
- Uses **Firebase Cloud Messaging (FCM)** with a Service Worker
- System notifications appear in the notification center
- Custom order bell sound
- Deep linking to order details

---

## 📱 Cross Platform Support

### Android
- ✅ Push Notifications
- ✅ Custom Sound
- ✅ Vibration
- ✅ Background Notifications

### iOS
- ✅ Push Notifications
- ✅ Custom Notification Sound
- ✅ Background Support (Browser limitations apply)

### Desktop
- ✅ Browser Notifications
- ✅ Background Notifications
- ✅ Notification Click Actions

---

## 🚀 Smart Token Management

- Prevents duplicate FCM registrations
- Stores token locally
- Syncs token with backend
- Automatically removes expired/invalid tokens
- Single initialization flow
- Supports multiple vendor devices

---

# 🛠 Tech Stack

### Frontend

- React
- Firebase Cloud Messaging (FCM)
- Service Workers
- OneSignal (Safe Fallback)
- React Router

### Backend

- Node.js
- Express.js
- MongoDB
- Firebase Admin SDK

---

# 📂 Project Structure

## Frontend

```
src/
│
├── firebase.js
├── utils/
│   └── notifications.js
│
├── pages/
│   ├── Cart.jsx
│   └── OrderTracker.jsx
│
public/
└── firebase-messaging-sw.js

index.html
```

---

## Backend

```
backend/

services/
└── notificationService.js

routes/
├── orders.js
└── fcm.js

models/
└── Store.js

config/
└── firebase-key.json

server.js
```

---

# ⚙️ Setup Guide

---

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/universe-food-ordering.git

cd universe-food-ordering
```

---

## 2. Install Dependencies

Frontend

```bash
npm install
```

Backend

```bash
cd backend

npm install
```

---

# 🔥 Firebase Setup

## Step 1

Go to

> Firebase Console

Create or select a project.

---

## Step 2

Enable

- Cloud Messaging

---

## Step 3

Generate a Service Account Key

Download

```
firebase-key.json
```

Place it inside

```
backend/config/firebase-key.json
```

---

## Step 4

Copy your

**Web App Config**

and update

```
src/firebase.js
```

Example:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

---

## Step 5

Get your

**VAPID Key**

Firebase Console

```
Project Settings
    ↓
Cloud Messaging
    ↓
Web Push Certificates
```

Add it inside

```
src/firebase.js
```

---

# 🚀 Frontend Initialization

Initialize Firebase Messaging when the application loads.

```javascript
import { initializeFCM } from "./firebase";

await initializeFCM();
```

---

# 🚀 Backend Usage

Send notifications whenever a new order is created.

```javascript
await notificationService.sendNewOrderNotification(
    fcmToken,
    orderData
);
```

---

# 🔄 Notification Flow

```text
Customer Places Order
          │
          ▼
Backend Creates Order
          │
          ▼
FCM Notification Generated
          │
          ▼
Firebase Cloud Messaging
          │
          ▼
Service Worker Receives Push
          │
          ▼
Notification Displayed
          │
          ▼
Vendor Clicks Notification
          │
          ▼
Vendor Dashboard Opens
```

---

# 🔊 Notification Configuration

## Order Bell

```
https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3
```

---

## Vibration Pattern

```javascript
[200, 100, 200, 100, 200]
```

---

## Android

```javascript
android: {
    notification: {
        sound: "2869-preview.mp3"
    }
}
```

---

## iOS

```javascript
apns: {
    payload: {
        aps: {
            sound: "2869-preview.mp3"
        }
    }
}
```

---

## Service Worker

```javascript
self.registration.showNotification(title, {
    body,
    icon,
    badge,
    vibrate: [200,100,200,100,200]
});
```

---

# 📡 API Endpoints

---

## Save FCM Token

```
POST /api/fcm/save-fcm-token
```

Body

```json
{
  "token": "fcm_token_here",
  "userId": "user_id",
  "userType": "vendor"
}
```

---

## Remove FCM Token

```
POST /api/fcm/remove-fcm-token
```

Body

```json
{
  "token": "fcm_token_here",
  "userId": "user_id"
}
```

---

# 🔐 Security

- Firebase Service Account is ignored using `.gitignore`
- Authentication required for FCM APIs
- Invalid tokens automatically removed
- No sensitive Firebase credentials exposed to frontend
- Token validation before sending notifications

---

# ⚡ Performance Optimizations

- Cached FCM Tokens
- Duplicate Registration Prevention
- Automatic Invalid Token Cleanup
- Batch Notification Support
- Graceful Notification Fallback
- Background Service Worker
- Lazy Notification Initialization

---

# 🐞 Troubleshooting

## Notifications Not Received

- Allow browser notifications
- Verify Firebase configuration
- Check FCM Token generation
- Ensure token exists in database
- Verify Service Worker registration

---

## Background Notifications Not Working

- Verify browser supports Service Workers
- Check browser background permissions
- Test using Chrome
- Verify HTTPS is enabled

---

## Notification Sound Missing

- Check browser audio permissions
- Verify notification sound URL
- Check device volume
- Test on a physical device

---

## Token Not Saving

- Verify backend API
- Check authentication
- Inspect Network Tab
- Review backend logs

---

# 📈 Performance

| Feature | Status |
|----------|--------|
| Background Notifications | ✅ |
| Push Notifications | ✅ |
| Token Caching | ✅ |
| Invalid Token Cleanup | ✅ |
| Batch Processing | ✅ |
| Cross Platform | ✅ |
| Service Worker | ✅ |
| Notification Click Actions | ✅ |
| Deep Linking | ✅ |
| Custom Sound | ✅ |

---

# ✅ Best Practices

- Request notification permission only once.
- Cache FCM tokens locally.
- Remove expired tokens automatically.
- Always implement fallback notification handling.
- Test on real devices.
- Monitor Firebase delivery reports.
- Keep Firebase credentials secure.

---

# 🚀 Future Improvements

- 📍 Location-Based Notifications
- 🖼 Rich Image Notifications
- 🎥 Video Notifications
- ⏰ Scheduled Notifications
- 📊 Notification Analytics
- 📈 Delivery Tracking
- 🎯 A/B Testing
- 👥 User Segmentation
- 🌐 Multi-language Notifications

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit changes

```bash
git commit -m "Added new feature"
```

4. Push

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

**UniVerse Food Ordering**

Built with ❤️ using

- React
- Node.js
- Express
- MongoDB

---

## ⭐ If you found this project useful, don't forget to give it a Star!
