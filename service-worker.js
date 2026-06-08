// Service Worker — Art D'Corte PWA v3
// Estrategia: network-first para HTML (siempre la última versión)
// Cache-first solo para recursos estáticos (iconos, fuentes, CDN)
// v3: precache del cascarón en install -> la app abre offline desde el primer uso
const CACHE = 'artdcorte-v3';

// Cascarón mínimo imprescindible para arrancar sin red.
// Sin estos tres scripts del CDN, React no monta y se ve pantalla negra.
const SHELL = [
  './index_pwa.html',
  './manifest_pwa.json',
  './icon192.png',
  './icon512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', e => {
  // Activar inmediatamente sin esperar al cierre de pestañas antiguas
  self.skipWaiting();
  // Precachear el cascarón (allSettled: un fallo puntual del CDN no rompe la instalación)
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Limpiar caches viejos
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Nunca cachear las llamadas al Apps Script (datos siempre frescos)
  if (url.hostname.includes('script.google.com')) return;

  // Para el HTML principal: network-first (siempre intentar versión nueva)
  // Si falla la red, servir desde caché
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index_pwa.html')))
    );
    return;
  }

  // Para todo lo demás (iconos, manifest, fuentes, CDN): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// Permitir que la página fuerce la activación desde JS
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
