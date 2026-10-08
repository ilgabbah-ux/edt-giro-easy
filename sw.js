// EDT Giro Easy · service worker: il gioco funziona anche offline dopo la prima apertura.
const CACHE = 'giro-easy-v53';
const FILES = ['./', './index.html', './style.css', './game.js', './physics.js', './scene3d.js', './progress.js', './audio.js', './icons.js', './mudfx.js', './voci.js', './voci-piloti.js', './piloti.js', './classifica.js',
  './three.module.min.js', './three.core.min.js', './RoundedBoxGeometry.js', './anton.woff2', './barlow-condensed-latin-600-normal.woff2', './barlow-condensed-latin-700-normal.woff2',
  './barlow-condensed-latin-800-italic.woff2', './edt-logo-small.jpg', './edt-logo.png', './img/edt-shield.webp', './img/ice-scrofy.webp', './img/angelo-suuuka.webp', './img/san-miti.webp', './img/i-want-you.webp', './icon-v53-192.png', './icon-v53-512.png', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Rete prima (così gli aggiornamenti arrivano subito), cache se offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return; // la classifica online non passa dalla cache
  // cache: 'no-cache' = chiede sempre al server se c'è una versione nuova (GitHub tiene le pagine 10 minuti)
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); if (r.ok) caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
