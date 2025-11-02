// Service Worker para Firebase Cloud Messaging
// Este arquivo DEVE estar em /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// 🔥 Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBLERXDIP6sIRrFqsWSw3TWeDyAz7_8fDA",
  authDomain: "fatepack.firebaseapp.com",
  projectId: "fatepack",
  storageBucket: "fatepack.firebasestorage.app",
  messagingSenderId: "367593974847",
  appId: "1:367593974847:web:839ca00f5b67ff65b75c8a"
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

// 🔔 Listener para notificações em background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Mensagem recebida em background:', payload)

  const notificationTitle = payload.notification?.title || 'Nova notificação'
  const notificationOptions = {
    body: payload.notification?.body || 'Você tem uma nova mensagem',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data,
    tag: payload.data?.id || 'default',
    requireInteraction: true,
  }

  // Registrar evento de recebimento (Analytics)
  // Nota: Analytics não funciona no SW, enviar para servidor via fetch se necessário
  
  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// 📊 Rastrear cliques na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notificação clicada:', event.notification)

  event.notification.close()

  // Abrir app ou focar janela existente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem janela aberta, focar nela
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Se não tem janela, abrir nova
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/inicio'
        return clients.openWindow(url)
      }
    })
  )

  // Enviar evento de clique para Analytics (via fetch para servidor)
  fetch('/api/analytics/notification-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: event.notification.title,
      timestamp: new Date().toISOString(),
    }),
  }).catch((err) => console.error('[SW] Erro ao enviar analytics:', err))
})
