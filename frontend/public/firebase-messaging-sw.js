// firebase-messaging-sw.js
// This Service Worker runs in the background and listens for FCM push messages even when the tab is closed/screen is locked.

// Import Firebase App and Messaging SDKs (Compat version for Service Workers)
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// Initialize Firebase App
firebase.initializeApp({
  apiKey: "AIzaSyD6IFV8OG0NUhVHI-Nd85Mw0TBEre4Ww7k",
  authDomain: "universe-order.firebaseapp.com",
  projectId: "universe-order",
  messagingSenderId: "878422402422",
  appId: "1:878422402422:web:2f9ddf4686296948f94657"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle fetch events with proper redirect handling
self.addEventListener('fetch', function(event) {
  // Only handle navigation requests, skip API calls and static assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { redirect: 'follow' }).catch(function(error) {
        console.log('Fetch error:', error);
        // Return a basic response if fetch fails
        return new Response('Service Worker Error', { 
          status: 500,
          statusText: 'Service Worker Error'
        });
      })
    );
  } else {
    // For non-navigation requests, let the browser handle normally
    event.respondWith(fetch(event.request));
  }
});

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log("FCM Background Message Received ", payload);

  const notificationTitle = payload.data?.title || payload.notification?.title || "🍔 New Order Received!";
  const notificationBody = payload.data?.body || payload.notification?.body || "A new order has been received.";
  const orderId = payload.data?.orderId || payload.data?.order_id || '';
  
  const notificationOptions = {
    body: notificationBody,
    icon: "https://www.universeorder.co.in/icons.svg",
    badge: "https://www.universeorder.co.in/favicon.svg",
    // Custom order bell sound - use a reliable source
    sound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: payload.data?.url || "/vendor/dashboard",
      orderId: orderId,
      type: payload.data?.type || 'new_order',
      click_action: payload.data?.click_action || "/vendor/dashboard"
    },
    // Add actions for quick responses
    actions: [
      {
        action: "accept",
        title: "✅ Accept",
        icon: "/icons.svg"
      },
      {
        action: "view", 
        title: "👁️ View",
        icon: "/icons.svg"
      }
    ],
    tag: `order-${orderId}`, // Prevent duplicate notifications
    renotify: true
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Close the notification first
  notification.close();

  // Determine URL to open
  let urlToOpen = data.url || "/vendor/dashboard";
  
  // Handle specific actions
  if (action === 'accept' && data.orderId) {
    urlToOpen = `/vendor/orders/${data.orderId}?action=accept`;
  } else if (action === 'view' && data.orderId) {
    urlToOpen = `/vendor/orders/${data.orderId}`;
  }

  const fullUrl = new URL(urlToOpen, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        
        // If client is already focused, just focus it
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then(focusedClient => {
            // Navigate to the specific URL if needed
            if (focusedClient.url !== fullUrl) {
              return focusedClient.navigate(fullUrl);
            }
          });
        }
      }
      
      // If no suitable client is found, open a new window
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Handle push subscription changes (optional but recommended)
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BFBclRUs4iKGG56oxPpSIXWF8ARNdJH2Ni_JZ9q0hxHYLIrZl-4OxSFCfMuLnoqD6LdZ4zj0HyqYqpB-6ZpgzGg')
    }).then(function(newSubscription) {
      // Send new subscription to server
      return fetch('/api/save-push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSubscription)
      });
    })
  );
});

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
