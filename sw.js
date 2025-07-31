const CACHE_NAME = 'lvbtn-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/connectWallet.js',
  '/login.html',
  '/signup.html',
  '/volunteer-hours.html',
  '/dashboard.html',
  '/styles.css',
  '/connectWallet.js',
  '/loginLogic.js',
  '/dashboardLogic.js',
  '/firebaseConfig.js',
  '/lvbtn-logo.png',
  '/favicon.ico'
];

event.waitUntil(
  caches.open(CACHE_NAME).then(cache => {
    return cache.addAll(urlsToCache);
  })
);

// Install: Pre-cache assets
self.addEventListener("install", event => {
  console.log("[SW] Installing Service Worker and caching static assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
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
