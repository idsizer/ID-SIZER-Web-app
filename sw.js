/* =====================================================================
   SIZER web edition — service worker
   ---------------------------------------------------------------------
   Caches the app shell so the site opens offline after the first visit.
   The 88 MB background-removal model is NOT precached: it is fetched
   from ml/ (or the CDN in idpl-config.js) the first time it is used,
   then kept by the browser's normal HTTP cache.

   Bump CACHE_VERSION whenever you upload changed files. Shell assets are
   network-first, so a connected browser always shows the deployed copy;
   the cache is only used when the network is unavailable.
   ===================================================================== */
const CACHE_VERSION = 'sizer-web-4.7.5-12';
const SHELL = [
  './',
  './index.html',
  './web.css',
  './web-bridge.js',
  './web-app.js',
  './idpl-config.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isLargeModel(url) {
  return /(^|\/)ml\//.test(url.pathname) || /\.(onnx|wasm)$/i.test(url.pathname);
}

function shellFallback() {
  return caches.match('./index.html')
    .then((hit) => hit || caches.match('./'))
    .then((hit) => hit || new Response(
      '<!doctype html><meta charset="utf-8"><title>SIZER is offline</title>' +
      '<p style="font:16px system-ui;padding:24px">SIZER has not been cached yet. ' +
      'Open the site once while online, then it will work offline.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    ));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Only same-origin files. Let the activation API go straight to the network.
  if (url.origin !== self.location.origin) return;

  // Never intercept the model / runtime: onnxruntime may use range requests.
  if (isLargeModel(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy)).catch(() => {});
            return res;
          }
          // A proxy / host error is still a failed page load. Prefer the
          // cached shell so the app opens offline.
          return shellFallback();
        })
        .catch(shellFallback)
    );
    return;
  }

  // Network-first for the shell. A new deployment is visible on
  // the next load, while the cached copy still covers offline use.
  const offlineCopy = () => caches.match(req).then((hit) => hit || new Response(
    'Offline and not cached.',
    { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  ));

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        }
        // A proxy / host outage can answer with 5xx instead of failing the
        // request. Treat that like offline and serve the cached shell.
        if (res && res.status >= 500) return offlineCopy();
        return res;
      })
      .catch(offlineCopy)
  );
});
