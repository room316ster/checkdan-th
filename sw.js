// CheckDan TH Service Worker for PWA Offline Caching
const CACHE_NAME = 'checkdan-cache-v15';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/provinces-data.js',
  './js/mock-data.js',
  './js/audio.js',
  './js/device.js',
  './js/voice.js',
  './js/voice-command.js',
  './js/services.js',
  './js/weather-radar.js',
  './js/location.js',
  './js/hud.js',
  './js/sos.js',
  './js/social.js',
  './js/github-sync.js',
  './js/routing.js',
  './js/blackspots.js',
  './js/traffic.js',
  './js/trip-logger.js',
  './js/navigation.js',
  './js/map.js',
  './js/app.js',
  './data/checkpoints.json',
  './data/blackspots.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('[SW] Pre-cache warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Pass-through for external map tiles & APIs
  if (url.includes('openstreetmap.org') ||
      url.includes('arcgisonline.com') ||
      url.includes('project-osrm.org') ||
      url.includes('cartocdn.com') ||
      url.includes('github.com') ||
      url.includes('rainviewer.com') ||
      url.includes('cdnjs.cloudflare.com') ||
      url.includes('fonts.googleapis.com')) {
    return;
  }

  // Network-first strategy for local scripts & HTML so updates apply immediately
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

