// sw.js — VCPF service worker
const CACHE_NAME = "lvbtn-cache-v3"; // bump this to force updates

const PRE_CACHE = [
  "/",                 // root
  "/index.html",
  "/signup.html",
  "/login.html",
  "/dashboard.html",
  "/volunteer-hours.html",

  // JS (now living under /js)
  "/js/connectWallet.js",
  "/js/loginLogic.js",
  "/js/dashboardLogic.js",
  "/js/kycUtils.js",
  "/js/firebaseConfig.js",
  "/js/setupKycDom.js",

  // App assets
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// INSTALL: pre-cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

// ACTIVATE: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null)))
    )
  );
  self.clients.claim();
});

// FETCH: cache-first for same-origin static; SPA fallback for navigations
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // For navigations (HTML pages), return index.html offline
  const isNavigation =
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"));

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Same-origin static: cache-first
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((resp) => {
            // Optionally cache new static responses
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return resp;
          })
          .catch(() => {
            // Fallback for missing static assets
            if (request.destination === "document") return caches.match("/index.html");
            return new Response("⚠️ Offline – resource not cached.");
          });
      })
    );
    return;
  }

  // Cross-origin (e.g., CoinGecko, gstatic): network-first, no cache
  event.respondWith(fetch(request).catch(() => new Response(null, { status: 504 })));
});
