// sw.js (place at root of site)
self.addEventListener("install", e => {
  console.log("Service Worker Installed");
});

self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});
