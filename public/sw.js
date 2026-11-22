// Service worker do SKZ Pocadex: permite abrir o app sem internet.
// __APP_VERSION__ é substituído no build (vite.config.ts).
const VERSION = '__APP_VERSION__';
const CACHE = `pocadex-app-${VERSION}`;
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      // Pré-carrega os arquivos JS/CSS referenciados pelo index.html
      const html = await (await fetch('./index.html', { cache: 'no-store' })).text();
      const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll(assets);
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('pocadex-app-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Outros sites (wikis, imagens) e a base de dados passam direto:
  // a base sempre busca a versão mais nova e tem cópia própria no aparelho.
  if (url.origin !== self.location.origin || url.pathname.endsWith('/data/photocards.json')) return;

  // Páginas: tenta a rede primeiro, cai para o cache offline
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // Só a página principal do app vira a cópia offline
          if (res.ok && /\/(index\.html)?$/.test(url.pathname)) {
            const cache = await caches.open(CACHE);
            cache.put('./index.html', res.clone());
          }
          return res;
        } catch {
          return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
        }
      })(),
    );
    return;
  }

  // Arquivos do app (têm hash no nome): cache primeiro
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })(),
  );
});
