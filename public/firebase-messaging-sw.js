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

// Badge counter persisted in IDB (Badging API has no getter).
function openBadgeDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('happydog-badge', 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('counter');
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}
function incrementBadge() {
  return openBadgeDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('counter', 'readwrite');
    const store = tx.objectStore('counter');
    const get = store.get('count');
    get.onsuccess = () => {
      const next = (get.result ?? 0) + 1;
      store.put(next, 'count');
      tx.oncomplete = () => resolve(next);
    };
    get.onerror = reject;
  }));
}
function resetBadge() {
  return openBadgeDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('counter', 'readwrite');
    tx.objectStore('counter').put(0, 'count');
    tx.oncomplete = resolve;
    tx.onerror = reject;
  }));
}

// Badge en raw push event: es el único contexto donde iOS acepta setAppBadge
// de forma fiable (dentro de callbacks Firebase el contexto puede no ser válido).
self.addEventListener('push', (event) => {
  event.waitUntil(
    incrementBadge().then((count) => {
      if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(count).catch(() => {});
      }
    })
  );
});

// La app envía CLEAR_BADGE al abrirse para resetear el contador.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_BADGE') {
    resetBadge().then(() => {
      if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
    });
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
    badge: '/icons/badge-96.svg',
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
        return resetBadge().then(() => {
          if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => {});
        });
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
