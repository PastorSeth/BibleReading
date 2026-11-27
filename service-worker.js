/* ============================================================
   OFFLINE SUPPORT — keeps a copy of the app on the phone so it
   opens without a connection.

   IMPORTANT: after changing ANY app file (index.html, style.css,
   any .js file, manifest.json, icons, fonts), bump the number in
   CACHE_NAME below. Otherwise phones that already have the app
   keep showing the old version.

   Only this site's own files are cached. Requests to the Google
   Sheet and to Biblia.com always go straight to the network.
   ============================================================ */

const CACHE_NAME = 'bible-reading-2027-v5';

const APP_SHELL = [
  './',
  'index.html',
  'style.css',
  'readings.js',
  'plan.js',
  'links.js',
  'store.js',
  'sync-config.js',
  'sync.js',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'fonts/AtkinsonHyperlegible-Regular.woff2',
  'fonts/AtkinsonHyperlegible-Bold.woff2',
];

// Fetch fresh copies (skipping the browser's own cache) so an update never
// stores yesterday's files under today's CACHE_NAME.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    // Pages ignore "?date=…" so a preview link still opens offline.
    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return res;
    })),
  );
});
