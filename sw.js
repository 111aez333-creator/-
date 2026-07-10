const CACHE_NAME = 'creative-gallery-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/2.html',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/css/styles.css',
  '/js/app.js',
  '/js/config.js',
  '/js/utils.js',
  '/js/firebase-init.js',
  '/js/navigation.js',
  '/js/lightbox.js',
  '/js/notifications.js',
  '/js/profile.js',
  '/js/gallery.js',
  '/js/upload.js',
  '/js/auth.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit') ||
    event.request.url.includes('securetoken.googleapis.com') ||
    event.request.url.includes('api.imgbb.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
