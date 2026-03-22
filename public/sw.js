// Bump version on every deploy so stale caches are cleared immediately.
const CACHE = 'precis-v3';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell every open tab to reload so it picks up fresh HTML + assets.
        // Without this, tabs controlled by the old SW keep their stale index.html
        // which references JS bundle filenames that no longer exist after a deploy.
        return self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
          .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_RELOAD' })));
      })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never cache HTML or API — always fresh from network.
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Cache-first for hashed static assets (JS, CSS, icons, etc.)
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
