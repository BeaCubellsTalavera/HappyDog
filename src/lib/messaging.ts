import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { messaging } from './firebase';

const SW_URL = '/firebase-messaging-sw.js';

// Pasamos la config Firebase por query params porque el SW no tiene acceso a
// import.meta.env — ver public/firebase-messaging-sw.js. Los valores no son
// secretos (van embebidos en el bundle de todos modos).
function buildSwUrl(): string {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  return `${SW_URL}?${params.toString()}`;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

export async function getFcmToken(vapidKey: string): Promise<string | null> {
  const m = await messaging;
  if (!m) return null;

  // Scope propio para no colisionar con el SW principal (vite-plugin-pwa) que
  // controla '/'. FCM entrega push a este SW por su registro, no por scope.
  const registration = await navigator.serviceWorker.register(buildSwUrl(), {
    scope: '/firebase-cloud-messaging-push-scope',
  });

  return getToken(m, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
}

export async function onMessageForeground(
  cb: (payload: MessagePayload) => void
): Promise<() => void> {
  const m = await messaging;
  if (!m) return () => {};
  return onMessage(m, cb);
}
