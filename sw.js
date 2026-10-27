// Offline support: precache every app file listed in precache.json, serve cache-first.
const PREFIX = 'dukkana-';
const FONT_CACHE = 'dukkana-fonts';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const { version, files } = await (await fetch('precache.json', { cache: 'no-store' })).json();
    const cache = await caches.open(PREFIX + version);
    await cache.addAll(files);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const { version } = await (await fetch('precache.json', { cache: 'no-store' }).catch(() => null))?.json?.() ?? {};
    if (version) {
      for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== PREFIX + version && key !== FONT_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(caches.open(FONT_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === 'navigate') return (await caches.match('./')) || (await caches.match('index.html'));
      throw err;
    }
  })());
});
