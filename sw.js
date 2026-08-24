// Basit önbellek: uygulama kabuğu offline çalışsın.
const VERSION = 'paceup-v0.3.5';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/storage.js',
  './js/stats.js',
  './js/chart.js',
  './js/format.js',
  './js/badges.js',
  './js/calendar.js',
  './js/score.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/maskable.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Gezinme isteklerinde önce ağ (güncel sürüm), aksi halde önbellek.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Diğer dosyalarda: önbellekten ver, arka planda tazele (stale-while-revalidate).
  // Böylece yeni sürüm, service worker güncellenmese bile bir sonraki açılışta gelir.
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
