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
    
    // 📊 Rastrear recebimento da notificação (Firebase Analytics)
    fetch('/api/analytics/notification-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        tag,
        timestamp: new Date().toISOString(),
      }),
    })
    .then(res => res.json())
    .then(data => {
      // Enviar evento para todas as abas abertas via Broadcast Channel
      if (data.event && 'BroadcastChannel' in self) {
        const channel = new BroadcastChannel('firebase-analytics')
        channel.postMessage(data.event)
        channel.close()
      }
    })
    .catch(() => {}); // Ignora erros de tracking
    
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
  
  // 📊 Rastrear clique na notificação (Firebase Analytics)
  fetch('/api/analytics/notification-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: event.notification.title,
      url,
      timestamp: new Date().toISOString(),
    }),
  })
  .then(res => res.json())
  .then(data => {
    // Enviar evento para todas as abas abertas via Broadcast Channel
    if (data.event && 'BroadcastChannel' in self) {
      const channel = new BroadcastChannel('firebase-analytics')
      channel.postMessage(data.event)
      channel.close()
    }
  })
  .catch(() => {}); // Ignora erros de tracking
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
