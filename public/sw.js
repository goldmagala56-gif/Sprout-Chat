const CACHE_NAME = 'sprout-shell-v1';
// Keep this list intentionally small: the app-shell only. Chat data itself
// comes from Supabase and should never be cached — messages must always be fresh.
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never intercept Supabase API/realtime calls or non-GET requests — this
  // service worker's only job is the app shell, not your live data.
  if (request.method !== 'GET' || request.url.includes('supabase.co')) return;

  // Network-first for navigations (so you always get the latest deployed
  // build when online), falling back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for everything else (hashed build assets — safe to cache
  // aggressively since a new deploy ships new filenames).
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Placeholder for phase 2 — actual push notifications land here once the
// server-side sender (Edge Function + VAPID) exists.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Sprout', {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});