const CACHE_NAME= "lvbtn-cache-v1";
// sw.js (fixed cache logic)
self.addEventListener("install", event => {
  console.log("[SW] Installing Service Worker and caching static assets...");

  const urlsToCache = [
    '/',
    '/index.html',
    '/connectWallet.js',
    '/login.html',
    '/signup.html',
    '/volunteer-hours.html',
    '/dashboard.html',
    '/loginLogic.js',
    '/dashboardLogic.js',
    '/firebaseConfig.js',
    '/LVBTN-logo.png',
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url =>
          fetch(url).then(response => {
            if (!response.ok) {
              throw new Error(`⚠️ Failed to fetch ${url}`);
            }
            return cache.put(url, response.clone());
          }).catch(err => {
            console.warn(`[SW] Skipping ${url}:`, err.message);
          })
        )
      );
    })
  );
});

// Activate: Cleanup old caches
self.addEventListener("activate", event => {
  console.log("[SW] Activating and cleaning old caches...");
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

// Fetch: Serve cached or fetch from network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response("⚠️ Offline – resource not cached.");
      });
    })
  );
});