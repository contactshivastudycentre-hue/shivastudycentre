// Hardened SW: pre-cache SPA shell so deep-link refreshes never 404.
// Network-first for navigation; only fall back to cached '/' if the network
// truly rejects (offline). Static assets cached cache-first.
const CACHE_NAME = 'ssc-static-v7';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/pwa-icon-192.svg',
  '/pwa-icon-512.svg',
  '/pwa-icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        STATIC_ASSETS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => (res && res.ok ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      ))
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

  // Navigation requests: network-first, fall back to cached '/' ONLY if
  // the network rejects (offline / DNS failure). Non-2xx responses are
  // passed through so the host (Lovable) handles routing/SPA fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/').then((r) => r || new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>Offline</h1><p>Please check your connection and try again.</p></body>',
          { status: 200, headers: { 'Content-Type': 'text/html' } },
        )),
      ),
    );
    return;
  }

  // Static assets we explicitly cached: cache-first
  if (STATIC_ASSETS.some((p) => url.pathname === p)) {
    event.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }

  // Everything else: pass through to network (browser HTTP cache + hashed
  // Vite filenames handle this efficiently).
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
