// Service Worker — Gestiona tu Flotilla
const CACHE_NAME = 'gtf-v2';
const OFFLINE_URL = '/login';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL, '/fleet-icon.png']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Gestiona tu Flotilla', body: event.data.text() }; }

  const title   = payload.title || 'Gestiona tu Flotilla';
  const options = {
    body:               payload.body  || '',
    icon:               '/fleet-icon.png',
    badge:              '/fleet-icon.png',
    tag:                payload.tag   || 'gtf-alert',
    renotify:           true,
    requireInteraction: payload.urgent ?? false,
    data:               { url: payload.url || '/ubicacion' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
