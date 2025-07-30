const CACHE_NAME = 'lvbtn-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/volunteer-hours.html',
  '/dashboard.html',
  '/styles.css',
  '/connectWallet.js',
  '/loginLogic.js',
  '/lvbtn-logo.png',
  '/favicon.ico'
];

self.addEventListener("install", e => {
  console.log("Service Worker Installed");
});

self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request).catch(() => new Response("Offline fallback")));
});
