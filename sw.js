// EDT Giro Easy · service worker: il gioco funziona anche offline dopo la prima apertura.
const CACHE = 'giro-easy-76f13047';   // v109.3 · all'installazione solo il necessario: voci dei piloti, foto e sfida dal vivo si salvano quando servono
const FILES = ['./', './index.html', './style.css', './game.js', './physics.js', './scene3d.js', './progress.js', './audio.js', './icons.js', './mudfx.js', './voci.js', './classifica.js', './push.js', './duel.js', 
  './three.module.min.js', './three.core.min.js', './RoundedBoxGeometry.js', './anton.woff2', './barlow-condensed-latin-600-normal.woff2', './barlow-condensed-latin-700-normal.woff2',
  './barlow-condensed-latin-800-italic.woff2', './edt-logo-small.jpg', './edt-logo.png', './img/edt-shield.webp', './img/ice-scrofy.webp', './img/angelo-suuuka.webp', './img/san-miti.webp', './img/i-want-you.webp', './img/san-braulio.webp', './img/anti-gev.webp', './img/gusta-ranch.webp', './img/track-0.webp', './img/track-1.webp', './img/track-3.webp', './img/track-4.webp', './img/track-5.webp', './img/track-6.webp', './img/track-7.webp', './img/track-8.webp', './img/track-10.webp', './img/track-11.webp', './img/track-12.webp', './icon-v121-192.png', './icon-v121-512.png', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && !k.startsWith('edt-nav')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Rete prima (così gli aggiornamenti arrivano subito), cache se offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return; // la classifica online non passa dalla cache
  // cache: 'no-cache' = chiede sempre al server se c'è una versione nuova (GitHub tiene le pagine 10 minuti)
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); if (r.ok) caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});

// v154 · notifiche push (Firebase Cloud Messaging, messaggi "data"): "X ti ha superato"
self.addEventListener('push', e => {
  let d = {}; try { const j = e.data ? e.data.json() : {}; d = j.data || j; } catch {}
  const title = d.title || 'Giro Easy', url = d.url || './';
  e.waitUntil(self.registration.showNotification(title, { body: d.body || '', icon: 'icon-v121-192.png', badge: 'icon-v121-192.png', tag: d.tag || 'giro-easy', renotify: true, data: { url } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const w = list.find(c => c.url.startsWith(self.registration.scope));
    if (w) { w.focus(); return w.navigate ? w.navigate(url).catch(() => {}) : null; }
    return self.clients.openWindow(url);
  }));
});
