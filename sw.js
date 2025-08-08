// sw.js — VCPF service worker (flat root)
const CACHE_NAME = "lvbtn-cache-v6"; // bump when you deploy

const PRE_CACHE = [
  "./", "./index.html", "./signup.html", "./login.html",
  "./dashboard.html", "./volunteer-hours.html",
  "./connectWallet.js", "./loginLogic.js", "./dashboardLogic.js",
  "./kycUtils.js", "./firebaseConfig.js", "./setupKycDom.js",
  "./manifest.json", "./icons/icon-192x192.png", "./icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRE_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  const isNav =
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));

  if (isNav) {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }

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
    return;
  }

  event.respondWith(fetch(request).catch(() => new Response(null, { status: 504 })));
});
