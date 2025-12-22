const CACHE_NAME = 'sho-v1';
const ASSETS = [
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './constants.ts',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});