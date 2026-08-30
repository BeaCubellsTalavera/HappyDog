import { create } from 'zustand';
import { onMessageForeground } from '../lib/messaging';
import { reconnectFirestore } from '../lib/firestoreReconnect';
import { getFeeding } from '../lib/feedings';
import { injectFeeding } from './useFeedings';

interface ToastPayload {
  title: string;
  body: string;
}

interface ToastState {
  current: ToastPayload | null;
  show: (t: ToastPayload) => void;
  hide: () => void;
}

const AUTO_HIDE_MS = 4000;
let hideTimer: number | null = null;

export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (t) => {
    set({ current: t });
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      set({ current: null });
      hideTimer = null;
    }, AUTO_HIDE_MS);
  },
  hide: () => {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ current: null });
  },
}));

// Listener a nivel módulo para no depender del mount de un componente. La promise
// interna espera a que `messaging.isSupported()` resuelva; hasta entonces no hay
// suscripción activa, pero tampoco perdemos ningún mensaje (FCM foreground exige
// que el listener esté conectado en el momento del message, no antes).
if (typeof window !== 'undefined') {
  onMessageForeground((payload) => {
    useToast.getState().show({
      title: payload.notification?.title ?? payload.data?.title ?? 'HappyDog',
      body: payload.notification?.body ?? payload.data?.body ?? '',
    });
    // Fetch directo del feeding por ID: actualiza la lista sin esperar al WebSocket.
    // El reconnect como red de seguridad por si el WebSocket sigue dormido.
    const feedingId = payload.data?.feedingId;
    if (feedingId) {
      getFeeding(feedingId).then((f) => { if (f) injectFeeding(f); }).catch(() => {});
    }
    reconnectFirestore(2_000);
  }).catch(() => {
    // messaging no soportado en este navegador; no hay nada que mostrar.
  });
}
