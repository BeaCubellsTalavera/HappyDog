// Service Worker para Firebase Cloud Messaging.
// La config se pasa por query params al registrar el SW desde src/lib/messaging.ts.
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

// Badge en raw push event: es el único contexto donde iOS acepta setAppBadge
// de forma fiable (dentro de callbacks Firebase el contexto puede no ser válido).
self.addEventListener('push', () => {
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch(() => {});
  }
});

messaging.onBackgroundMessage((payload) => {
  // El compat SDK SIEMPRE delega a este callback sin auto-mostrar nada.
  // Leer de payload.notification (cuando se usa webpush.notification en el
  // servidor) con fallback a payload.data (mensajes data-only legacy).
  const title = payload.notification?.title ?? payload.data?.title ?? 'HappyDog';
  const body = payload.notification?.body ?? payload.data?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'happydog-feeding',
    renotify: true,
    data: payload.data ?? {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.registration.getNotifications({ tag: 'happydog-feeding' })
      .then((ns) => {
        ns.forEach((n) => n.close());
        if ('clearAppBadge' in self.navigator) return self.navigator.clearAppBadge();
      })
      .then(() =>
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          for (const client of clientList) {
            if ('focus' in client) return client.focus();
          }
          if (self.clients.openWindow) return self.clients.openWindow('/');
        })
      )
  );
});
