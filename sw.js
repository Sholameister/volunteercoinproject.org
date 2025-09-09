// sw.js — VCPF service worker (root)
const CACHE_NAME = "lvbtn-cache-v8";          // bump to force update
const RUNTIME_CACHE = `${CACHE_NAME}-rt`;
const PRE_CACHE = [
  "/",
  "/index.html",
  "/signup.html",
  "/login.html",
  "/dashboard.html",
  "/volunteer-hours.html",
  "/connectWallet.js",
  "/loginLogic.js",
  "/dashboardLogic.js",
  "/kycUtils.js",
  "/firebaseConfig.js",
  "/setupKycDom.js",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install: precache app shell & take control immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean old caches & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((n) => {
          if (n !== CACHE_NAME && n !== RUNTIME_CACHE) return caches.delete(n);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin GET; network fallback and runtime-cache it
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    // For cross-origin (Firebase, CDNs), just try network, fall back to cache if any
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Same-origin: try cache, else network and put in runtime cache
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          const respClone = resp.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, respClone));
          return resp;
        })
        .catch(() => {
          // If offline and asking for a page, serve index.html
          if (req.destination === "document") return caches.match("/index.html");
          return new Response("⚠️ Offline – resource not cached.", { status: 504 });
        });
    })
  );
});
