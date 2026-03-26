const CACHE_NAME = 'universe-v1';
const urlsToCache = [
  '/',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/public/icons.svg',
  '/public/favicon.svg'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache when offline with proper redirect handling
self.addEventListener('fetch', event => {
  // Handle fetch with proper redirect mode
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { redirect: 'follow' })
        .then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          // Cache dynamic assets
          if (event.request.url.includes('/assets/') || 
              event.request.url.includes('/src/') ||
              event.request.url.includes('/public/')) {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(event.request);
        })
    );
  } else {
    // For non-navigation requests, try cache first
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }

          // Clone request for fetch
          const fetchRequest = event.request.clone();

          return fetch(fetchRequest, { redirect: 'follow' }).then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache dynamic assets
            if (event.request.url.includes('/assets/') || 
                event.request.url.includes('/src/') ||
                event.request.url.includes('/public/')) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          }).catch(() => {
            // Return cached version if network fails
            return caches.match(event.request);
          });
        })
    );
  }
});

/* 
// Background sync for notifications (Disabled - now handled by FCM)
self.addEventListener('sync', event => {
  if (event.tag === 'order-notification') {
    event.waitUntil(showOrderNotification());
  }
});

// Push notification handler (Disabled - now handled by FCM)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New order received!',
    icon: '/icons.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'accept',
        title: 'Accept Order',
        icon: '/icons.svg'
      },
      {
        action: 'reject',
        title: 'Reject Order',
        icon: '/icons.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('UniVerse - New Order!', options)
  );
});

// Notification click handler (Disabled - now handled by FCM)
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'accept') {
    // Handle accept action
    event.waitUntil(
      clients.openWindow('/vendor/orders?action=accept')
    );
  } else if (event.action === 'reject') {
    // Handle reject action
    event.waitUntil(
      clients.openWindow('/vendor/orders?action=reject')
    );
  } else {
    // Just open the app
    event.waitUntil(
      clients.openWindow('/vendor/orders')
    );
  }
});

function showOrderNotification() {
  return self.registration.showNotification('UniVerse', {
    body: 'You have a new order!',
    icon: '/icons.svg',
    tag: 'order-notification'
  });
}
*/
