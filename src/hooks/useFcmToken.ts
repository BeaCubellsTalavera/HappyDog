import { create } from 'zustand';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getFcmToken, requestPermission } from '../lib/messaging';
import { useAuth } from './useAuth';

const TOKEN_STORAGE_KEY = 'happydog_fcm_token';

type NotifPermission = 'unsupported' | 'default' | 'granted' | 'denied';

interface FcmState {
  permission: NotifPermission;
  // true = token registrado en Firestore para este dispositivo
  enabled: boolean;
  loading: boolean;
  error: string | null;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
}

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

function initialPermission(): NotifPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifPermission;
}

export const useFcmToken = create<FcmState>((set) => ({
  permission: initialPermission(),
  enabled: typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_STORAGE_KEY),
  loading: false,
  error: null,

  enableNotifications: async () => {
    const user = useAuth.getState().user;
    if (!user) {
      set({ error: 'Necesitas iniciar sesión primero.' });
      return;
    }
    if (!VAPID_KEY) {
      set({ error: 'Falta VITE_VAPID_KEY en la configuración.' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const perm = await requestPermission();
      if (perm !== 'granted') {
        set({ permission: perm as NotifPermission, loading: false });
        return;
      }
      const token = await getFcmToken(VAPID_KEY);
      if (!token) {
        set({
          permission: 'granted',
          loading: false,
          error: 'No se pudo obtener el token FCM (¿navegador no soportado?).',
        });
        return;
      }

      // Reemplazar el token anterior de este contexto (navegador/PWA) en lugar
      // de acumular: cada contexto tiene exactamente un token activo a la vez.
      const prevToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const userRef = doc(db, 'users', user.uid);
      if (prevToken && prevToken !== token) {
        await updateDoc(userRef, { fcmTokens: arrayRemove(prevToken) });
      }
      await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      set({ permission: 'granted', enabled: true, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al activar notificaciones.',
      });
    }
  },

  disableNotifications: async () => {
    const user = useAuth.getState().user;
    if (!user) return;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    set({ loading: true, error: null });
    try {
      if (token) {
        await updateDoc(doc(db, 'users', user.uid), {
          fcmTokens: arrayRemove(token),
        });
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      set({ enabled: false, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al desactivar notificaciones.',
      });
    }
  },
}));
