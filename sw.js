// sw.js — VCPF service worker (flat root)
const CACHE_NAME = "lvbtn-cache-v7"; // bump when you deploy

const PRE_CACHE = [
  "./", "./index.html", "./signup.html", "./login.html",
  "./dashboard.html", "./volunteer-hours.html",
  "./connectWallet.js", "./loginLogic.js", "./dashboardLogic.js",
  "./kycUtils.js", "./firebaseConfig.js", "./setupKycDom.js",
  "./manifest.json", "./icons/icon-192x192.png", "./icons/icon-512x512.png",
];

// sw.js — force-update & immediate control

self.addEventListener('install', event => {
  // Skip the "waiting" phase
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Claim control so the new SW takes over right away
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Basic network-first fetch
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});


  if (sameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return resp;
        });
      })
    );
  }

  event.respondWith(fetch(request).catch(() => new Response(null, { status: 504 })));

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
>>>>>>> 86c5d19 (Initial Firebase Github Actions setup)
