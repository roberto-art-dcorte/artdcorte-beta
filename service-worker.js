// Service Worker mínimo para Art D'Corte PWA
// Su único propósito es hacer la app instalable como PWA verdadera

const CACHE = 'artdcorte-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  // Estrategia: network first, fallback a caché si no hay red
  // No cachear las llamadas al Apps Script (datos siempre frescos)
  if (e.request.url.includes('script.google.com')) return;
  
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
