// Service Worker for PWA with Offline Support
const CACHE_NAME = 'emergency-app-v2';
const RUNTIME_CACHE = 'emergency-runtime-v2';
const OFFLINE_QUEUE = 'emergency-offline-queue';

const urlsToCache = [
  '/',
  '/admin',
  '/reports',
  '/login',
  '/user',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network first strategy for API calls
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        });
      })
  );
});

// Background Sync - sync queued reports when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncQueuedReports());
  }
});

// Sync queued reports
async function syncQueuedReports() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const data = await response.json();

        // Attempt to send the queued report
        const syncResponse = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(data)
        });

        if (syncResponse.ok) {
          // Remove from queue if successful
          await cache.delete(request);
          
          // Notify all clients about successful sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              data: data
            });
          });
        }
      } catch (error) {
        console.error('Error syncing report:', error);
      }
    }
  } catch (error) {
    console.error('Error in syncQueuedReports:', error);
  }
}

// Message handler for manual sync trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncQueuedReports());
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-reports-periodic') {
    event.waitUntil(syncQueuedReports());
  }
});

