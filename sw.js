/* SDS Checklists service worker – caches the app shell only.
   Cross-origin requests (Open-Meteo, NOAA, IAA map) are never intercepted or cached. */
const CACHE = 'sds-checklist-v2.0.0';
const SHELL = [
  './', './index.html', './manifest.json',
  './icons/logo.png', './icons/logo-rev.png', './icons/apple-touch-icon.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/favicon-32.png'
];
self.addEventListener('install', e => {
  // cache:'reload' bypasses the HTTP cache so a new version never caches stale files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // APIs & external links: straight to network
  if (req.mode === 'navigate') {
    // Cache first (instant + works with no signal), refresh the cached page in the background
    e.respondWith(caches.match('./index.html').then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Stale-while-revalidate for shell assets
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
