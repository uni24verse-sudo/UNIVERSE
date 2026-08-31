import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase Web configuration — MUST match firebase-messaging-sw.js exactly
const firebaseConfig = {
  apiKey: "AIzaSyD6IFV8OG0NUhVHI-Nd85MwOTbEre4Ww7k",
  authDomain: "universe-order.firebaseapp.com",
  projectId: "universe-order",
  storageBucket: "universe-order.firebasestorage.app",
  messagingSenderId: "878422402422",
  appId: "1:878422402422:web:2f9ddf4686296948f94657",
  measurementId: "G-65HVGEML03"
};

const VAPID_KEY = "BFBclRUs4iKGG56oxPpSIXWF8ARNdJH2Ni_JZ9q0hxHYLIrZl-4OxSFCfMuLnoqD6LdZ4zj0HyqYqpB-6ZpgzGg";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// ============================================================
// REGISTER SERVICE WORKER
// We explicitly register our firebase-messaging-sw.js so that
// Firebase SDK uses THIS worker (not a hidden one) for push.
// ============================================================
async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) return undefined;
  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    // Wait for the SW to be ready
    await navigator.serviceWorker.ready;
    console.log("[FCM] Service worker registered & ready");
    return registration;
  } catch (err) {
    console.error("[FCM] Service worker registration failed:", err);
    return undefined;
  }
}

// ============================================================
// GET FCM TOKEN
// Always registers the SW first, then asks Firebase for a token
// bound to that specific SW registration.
// ============================================================
export const requestFCMPermission = async () => {
  try {
    // 1. Ask for notification permission
    if (Notification.permission === "denied") {
      console.warn("[FCM] Notification permission denied");
      return null;
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("[FCM] User declined notification permission");
        return null;
      }
    }

    // 2. Register our service worker
    const swRegistration = await getServiceWorkerRegistration();

    // 3. Get FCM token bound to our service worker
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.substring(0, 20) + "...");
      return token;
    } else {
      console.warn("[FCM] No token returned by Firebase");
      return null;
    }
  } catch (err) {
    console.error("[FCM] Token generation failed:", err);
    return null;
  }
};

// ============================================================
// FOREGROUND MESSAGE HANDLER
// Shows a visual notification + plays audio when the tab IS open.
// ============================================================
export const onForegroundMessage = () => {
  onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message:", payload);

    const title = payload.data?.title || payload.notification?.title || "New Order!";
    const body  = payload.data?.body  || payload.notification?.body  || "A new order has been received.";

    // Play notification sound
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play().catch(() => {});

    // Use the Service Worker to show a real Chrome notification popup
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body: body,
          icon: "https://www.universeorder.co.in/icons.svg",
          badge: "https://www.universeorder.co.in/favicon.svg",
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: payload.data || {},
        });
      });
    }
  });
};

// ============================================================
// INITIALIZE FCM — single entry point
// ============================================================
export const initializeFCM = async () => {
  return await requestFCMPermission();
};
