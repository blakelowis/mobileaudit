var CACHE_NAME = 'birds-audit-v1';
var ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './tailwind.min.css',
  './icon-192.png',
  './icon-512.png',
  './AuditQuestions.json',
  './js/db.js',
  './js/store-data.js',
  './js/audit-engine.js',
  './js/audit-ui.js',
  './js/export.js',
  './jszip.min.js',
  './jspdf.umd.min.js',
  './jspdf.plugin.autotable.min.js',
  './html2canvas.min.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});
