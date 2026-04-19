// Minimal SW: network-first for navigation (so PWA never serves a stale blank shell),
// cache-first for static icons/manifest. No SPA pre-cache that could go stale.
const CACHE_NAME = 'ssc-static-v6';
const STATIC_ASSETS = [
  '/manifest.json',
  '/pwa-icon-192.svg',
  '/pwa-icon-512.svg',
  '/pwa-icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept Supabase / API / cross-origin auth requests
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in') ||
    url.pathname.startsWith('/api') ||
    url.hostname.includes('googleapis')
  ) {
    return;
  }

  // Navigation requests: always go to network so we never serve a stale SPA shell.
  // Fall back to '/' from cache only if offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((r) => r || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  // Static assets we explicitly cached: cache-first
  if (STATIC_ASSETS.some((p) => url.pathname === p)) {
    event.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }

  // Everything else: network only (no aggressive caching that could cause stale builds)
  // The browser HTTP cache + Vite hashed filenames already handle this efficiently.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
