const CACHE_NAME = 'sho-v2';
const ASSETS = [
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './constants.ts',
  './manifest.json'
];

// High-quality SVG logo of a Sho cup and dice
const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="cupGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#8d6e63" />
      <stop offset="100%" style="stop-color:#3e2723" />
    </radialGradient>
  </defs>
  <path d="M100,180 Q256,120 412,180 L370,440 Q256,500 142,440 Z" fill="url(#cupGrad)" stroke="#2d1d1a" stroke-width="8"/>
  <ellipse cx="256" cy="180" rx="156" ry="40" fill="#4e342e" stroke="#2d1d1a" stroke-width="4"/>
  <rect x="190" y="270" width="70" height="70" rx="12" fill="#fff9c4" stroke="#fbc02d" stroke-width="3" transform="rotate(-15 225 305)"/>
  <circle cx="215" cy="300" r="7" fill="#d32f2f" transform="rotate(-15 225 305)"/>
  <rect x="270" y="320" width="70" height="70" rx="12" fill="#fff9c4" stroke="#fbc02d" stroke-width="3" transform="rotate(10 305 355)"/>
  <circle cx="290" cy="340" r="5" fill="#212121" transform="rotate(10 305 355)"/>
  <circle cx="320" cy="370" r="5" fill="#212121" transform="rotate(10 305 355)"/>
</svg>`.trim();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept requests for the virtual logo file
  if (url.pathname.endsWith('sho_logo.png')) {
    const response = new Response(LOGO_SVG, {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
    event.respondWith(response);
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
