// sw.js v1.0
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(clients.claim()); });
self.addEventListener('fetch', function (e) {
    if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request));
    }
});
