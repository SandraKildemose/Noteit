const CACHE = 'noteit-v85-ipad';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/assets/icon.svg',
  '/assets/icon-128.png',
  '/assets/icon-512.png',
  '/version.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return caches.match('/index.html');
      })
    )
  );
});
