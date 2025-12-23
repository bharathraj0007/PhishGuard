// PhishGuard Service Worker for offline support and network resilience

const CACHE_NAME = 'phishguard-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        console.log('Service Worker: Some assets failed to cache');
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first for API calls, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API calls: Network first, fallback to cache
  if (url.pathname.includes('/api') || url.pathname.includes('functions')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response('Network error - please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        })
    );
  } else {
    // Static assets: Cache first, fallback to network
    event.respondWith(
      caches.match(request).then((response) => {
        return (
          response ||
          fetch(request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
              return response;
            })
            .catch(() => {
              return new Response('Offline - asset not available', {
                status: 503,
                statusText: 'Service Unavailable',
              });
            })
        );
      })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
