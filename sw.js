// Chiya service worker: serve from cache instantly (works offline),
// refresh the cache in the background whenever there is signal.
const CACHE = 'chiya-v21';
const ASSETS = ['./', './index.html', './style.css', './js/icons.js', './js/data.js', './js/art.js', './js/game.js', './js/ui.js', './manifest.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('version.json')) { e.respondWith(fetch(e.request, { cache: 'no-store' })); return; }
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request, { ignoreSearch: true }).then(cached => {
        const network = fetch(e.request)
          .then(res => { if (res && res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => cached || cache.match('./index.html'));
        return cached || network;
      })
    )
  );
});
