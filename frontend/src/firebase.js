import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Standard Firebase Web configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6IFV8OG0NUhVHI-Nd85MwOTbEre4Ww7k",
  authDomain: "universe-order.firebaseapp.com",
  projectId: "universe-order",
  storageBucket: "universe-order.firebasestorage.app",
  messagingSenderId: "878422402422",
  appId: "1:878422402422:web:2f9ddf4686296948f94657",
  measurementId: "G-65HVGEML03" // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = getMessaging(app);

// Store token to prevent repeated requests
let currentToken = null;
let isTokenInitialized = false;

// Function to request notification permission and generate a device token
export const requestFCMPermission = async () => {
  try {
    // Prevent multiple simultaneous token requests
    if (isTokenInitialized) {
      console.log('FCM token already initialized, returning existing token');
      return currentToken;
    }

    // Check if notification permission is already granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }
    } else if (Notification.permission === 'denied') {
      console.warn('Notification permission previously denied');
      return null;
    }

    // We use VAPID key pair you generated in Firebase Console
    const token = await getToken(messaging, {
      vapidKey: "BFBclRUs4iKGG56oxPpSIXWF8ARNdJH2Ni_JZ9q0hxHYLIrZl-4OxSFCfMuLnoqD6LdZ4zj0HyqYqpB-6ZpgzGg",
    });

    if (token) {
      console.log('FCM Registration Token Generated successfully');
      currentToken = token;
      isTokenInitialized = true;
      
      // Store token in localStorage to persist across sessions
      localStorage.setItem('fcm_token', token);
      
      return token;
    } else {
      console.warn('No FCM registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error("FCM Permission Denied or Failed", err);
    return null;
  }
};

// Function to get current token natively from Firebase
export const getCurrentFCMToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: "BFBclRUs4iKGG56oxPpSIXWF8ARNdJH2Ni_JZ9q0hxHYLIrZl-4OxSFCfMuLnoqD6LdZ4zj0HyqYqpB-6ZpgzGg",
    });
    return token;
  } catch (err) {
    console.warn("Failed to get FCM token natively:", err);
    return null;
  }
};

// Function to handle foreground messages
export const onForegroundMessage = () => {
  onMessage(messaging, (payload) => {
    console.log('FCM Foreground Message Received:', payload);
    
    // Show notification when app is in foreground
    const notificationTitle = payload.data?.title || payload.notification?.title || "New Order!";
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || "A new order has been received.",
      icon: "https://www.universeorder.co.in/icons.svg",
      badge: "https://www.universeorder.co.in/favicon.svg",
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: payload.data || {}
    };

    // Play notification sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));

    // Show notification using Service Worker for maximum reliability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(notificationTitle, notificationOptions);
      }).catch(err => {
        console.error('Service Worker showNotification failed, falling back:', err);
        new Notification(notificationTitle, notificationOptions);
      });
    } else {
      new Notification(notificationTitle, notificationOptions);
    }
  });
};

// Initialize FCM on load
export const initializeFCM = async () => {
  // Check if we already have a token
  const existingToken = await getCurrentFCMToken();
  if (existingToken) {
    console.log('Using existing FCM token');
    return existingToken;
  }

  // Request new token if none exists
  return await requestFCMPermission();
};
