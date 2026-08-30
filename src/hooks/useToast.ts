import { create } from 'zustand';
import { onMessageForeground } from '../lib/messaging';
import { useTodayFeedings } from './useFeedings';

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

if (typeof window !== 'undefined') {
  onMessageForeground((payload) => {
    useToast.getState().show({
      title: payload.notification?.title ?? payload.data?.title ?? 'HappyDog',
      body: payload.notification?.body ?? payload.data?.body ?? '',
    });
    // Recargar feedings de hoy: captura el feeding notificado y cualquier otro
    // que no tuviera push propio (por existir uno más reciente cuando la CF ejecutó).
    useTodayFeedings.getState().reload();
  }).catch(() => {});
}
