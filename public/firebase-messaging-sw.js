// Service Worker para Firebase Cloud Messaging.
// La config se pasa por query params al registrar el SW desde src/lib/messaging.ts,
// para evitar hardcodear las credenciales Firebase en un archivo committeado.
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

// El badge hay que subirlo desde el evento `push` nativo, no desde
// onBackgroundMessage: en iOS el callback de Firebase no está en el
// contexto de evento que iOS requiere para setAppBadge.
self.addEventListener('push', () => {
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch(() => {});
  }
});

messaging.onBackgroundMessage((payload) => {
  // El mensaje se envía como data-only (sin campo notification) para que el
  // navegador no muestre una notificación automáticamente además de esta.
  // Si el SDK auto-mostrase por el campo notification tendríamos el doble.
  const title = payload.data?.title ?? 'HappyDog';
  const body = payload.data?.body ?? '';

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
    // Cerrar todas las notificaciones del mismo tag + limpiar badge
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
