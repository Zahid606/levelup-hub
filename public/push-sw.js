/* Push messaging service worker (background notifications). */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  void event;
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'New update', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'New notification';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo-small.webp',
    badge: '/favicon.svg',
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    data: { url: payload.url || '/' },
    actions: [{ action: 'open', title: payload.actionLabel || 'Watch Now' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return undefined;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
