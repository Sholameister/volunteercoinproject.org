// sw.js — VCPF service worker (flat root)
const CACHE_NAME = "lvbtn-cache-v7"; // bump when you deploy

const PRE_CACHE = [
  "./", "./index.html", "./signup.html", "./login.html",
  "./dashboard.html", "./volunteer-hours.html",
  "./js/connectWallet.js", "./js/loginLogic.js", "./js/dashboardLogic.js",
  "./js/kycUtils.js", "./js/firebaseConfig.js", "./js/setupKycDom.js",
  "./js/manifest.json", "./icons/icon-192x192.png", "./icons/icon-512x512.png",
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
    event.respondWith(fetch(request).catch(() => new Response(null, { status: 504 })));
});
