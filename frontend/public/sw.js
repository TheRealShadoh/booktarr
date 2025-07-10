/**
 * Booktarr Progressive Web App Service Worker
 * Handles caching, offline functionality, and background sync
 */

// Import Workbox modules
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { StaleWhileRevalidate, CacheFirst, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { BackgroundSync, Queue } = workbox.backgroundSync;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/books'),
  new StaleWhileRevalidate({
    cacheName: 'api-books',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Cache settings API with NetworkFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/settings'),
  new NetworkFirst({
    cacheName: 'api-settings',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
);

// Cache search API with shorter TTL
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/search'),
  new StaleWhileRevalidate({
    cacheName: 'api-search',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 30, // 30 minutes
      }),
    ],
  })
);

// Cache images with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Cache external book cover images
registerRoute(
  ({ url }) => url.origin === 'https://books.google.com' || 
              url.origin === 'https://covers.openlibrary.org',
  new CacheFirst({
    cacheName: 'book-covers',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
      }),
    ],
  })
);

// Background sync for offline actions
const bgSyncQueue = new Queue('book-actions', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
      } catch (error) {
        console.error('Background sync failed:', error);
        // Re-queue the request to try again later
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Queue offline book additions
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api/library/add') && request.method === 'POST',
  async ({ request }) => {
    try {
      const response = await fetch(request);
      return response;
    } catch (error) {
      // If offline, queue the request
      await bgSyncQueue.pushRequest({ request });
      
      // Return a custom offline response
      return new Response(
        JSON.stringify({
          message: 'Book queued for addition when back online',
          offline: true,
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
);

// Handle offline navigation
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'navigation',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Install prompt handling
self.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  // Store the event for later use
  self.deferredPrompt = event;
  
  // Notify the app that install prompt is available
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'INSTALL_PROMPT_AVAILABLE',
      });
    });
  });
});

// Handle install
self.addEventListener('appinstalled', (event) => {
  console.log('Booktarr PWA installed');
  
  // Notify the app
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'APP_INSTALLED',
      });
    });
  });
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SHOW_INSTALL_PROMPT') {
    if (self.deferredPrompt) {
      self.deferredPrompt.prompt();
      self.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        self.deferredPrompt = null;
      });
    }
  }
});

// Network status monitoring
self.addEventListener('online', () => {
  console.log('App is back online');
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_STATUS_CHANGE',
        online: true,
      });
    });
  });
});

self.addEventListener('offline', () => {
  console.log('App is offline');
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NETWORK_STATUS_CHANGE',
        online: false,
      });
    });
  });
});

// Cache cleanup on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('booktarr-') && 
                !cacheName.includes('v' + self.location.search.slice(1))) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Periodic background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'book-sync') {
    event.waitUntil(
      // Sync books data when online
      fetch('/api/books')
        .then(response => response.json())
        .then(data => {
          // Update cache with fresh data
          caches.open('api-books').then(cache => {
            cache.put('/api/books', new Response(JSON.stringify(data)));
          });
        })
        .catch(error => {
          console.error('Background sync failed:', error);
        })
    );
  }
});

console.log('Booktarr Service Worker loaded');