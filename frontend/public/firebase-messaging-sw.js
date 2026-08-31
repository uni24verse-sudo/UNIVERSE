// Firebase Messaging Service Worker
// Handles background push notifications when the tab is minimized, closed, or phone is locked.

importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// Initialize Firebase — MUST match frontend firebase.js config exactly
firebase.initializeApp({
  apiKey: "AIzaSyD6IFV8OG0NUhVHI-Nd85MwOTbEre4Ww7k",
  authDomain: "universe-order.firebaseapp.com",
  projectId: "universe-order",
  storageBucket: "universe-order.firebasestorage.app",
  messagingSenderId: "878422402422",
  appId: "1:878422402422:web:2f9ddf4686296948f94657"
});

const messaging = firebase.messaging();

// ============================================================
// BACKGROUND MESSAGE HANDLER
// This fires when a data-only FCM message arrives and
// the page is NOT in the foreground.
// ============================================================
messaging.onBackgroundMessage(function(payload) {
  console.log("[SW] Background message received:", payload);

  const title = payload.data?.title || "🍔 New Order Received!";
  const body  = payload.data?.body  || "You have a new order.";
  const orderId = payload.data?.orderId || "";

  const options = {
    body: body,
    icon: "https://www.universeorder.co.in/icons.svg",
    badge: "https://www.universeorder.co.in/favicon.svg",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: "order-" + orderId,
    renotify: true,
    data: {
      url: payload.data?.url || "/vendor/dashboard",
      orderId: orderId
    }
  };

  return self.registration.showNotification(title, options);
});

// ============================================================
// NOTIFICATION CLICK HANDLER
// Opens the dashboard or focuses existing tab when tapped.
// ============================================================
self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = new URL(data.url || "/vendor/dashboard", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      // Focus existing tab if one is open
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus().then(function(c) {
            if (c.url !== urlToOpen) return c.navigate(urlToOpen);
          });
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(urlToOpen);
    })
  );
});
