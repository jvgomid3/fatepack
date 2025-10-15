self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Basic fetch passthrough; customize caching if needed
self.addEventListener('fetch', () => {
  // no-op for now
});

// Show notifications on push messages
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'FatePack';
    const body = data.body || '';
    const url = data.url || '/';
    const icon = '/placeholder-logo.png';
    const badge = '/placeholder-logo.png';
    const tag = data.tag || 'fatepack-general';
    const count = typeof data.count === 'number' ? data.count : undefined;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        data: { url },
        tag,
        renotify: true,
      })
    );
    // Try Badging API from SW when supported and a count is provided
    try {
      if (typeof count === 'number' && 'setAppBadge' in self.registration) {
        (self.registration).setAppBadge(count).catch(() => {});
      }
    } catch (e) {}
  } catch (e) {
    // ignore
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
