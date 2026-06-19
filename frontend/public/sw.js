const CACHE_VERSION = 'astramind-v2.0.5';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const ALL_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];

const PRECACHE_URLS = [
  '/',
  '/chat',
  '/pricing',
  '/manifest.json',
];

// ── INSTALL: Precache core shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // Force immediate activation
  );
});

// ── ACTIVATE: Prune old caches & notify clients of update ────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete all old versioned caches
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => !ALL_CACHES.includes(name))
          .map((name) => caches.delete(name))
      )),
      // Take control of all open tabs immediately
      self.clients.claim(),
    ]).then(() => {
      // Notify all tabs that a new version is now active
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// ── FETCH: Smart caching strategy ────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always bypass: API calls, auth, external services, HMR
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.includes('_next/webpack-hmr') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // NAVIGATION: Network-first with cache fallback (ensures fresh pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // JS/CSS CHUNKS: Network-first (always get latest code)
  if (url.pathname.includes('_next/static/chunks')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // STATIC ASSETS (images, fonts, icons): Cache-first with background revalidation
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
        }
        return res;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});

// ── PUSH NOTIFICATIONS (future-ready) ────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'ASTRAMIND', body: 'You have a new message.' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/chat'));
});
