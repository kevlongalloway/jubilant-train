// Cache version — bump this when you need to invalidate all cached assets.
const CACHE = 'precis-v2';

self.addEventListener('install', e => {
  // Activate immediately without waiting for old tabs to close.
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  // Delete every cache except the current version.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never cache index.html or API calls — always go to the network.
  // This prevents a stale index.html from referencing a JS bundle that
  // no longer exists after a new deploy (which would cause a blank screen).
  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Cache-first for all other static assets (hashed JS/CSS bundles, icons, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
