import { create } from 'zustand';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getFcmToken, requestPermission } from '../lib/messaging';
import { useAuth } from './useAuth';

type NotifState = 'unsupported' | 'default' | 'granted' | 'denied';

interface FcmState {
  permission: NotifState;
  loading: boolean;
  error: string | null;
  enableNotifications: () => Promise<void>;
}

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

function initialPermission(): NotifState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifState;
}

export const useFcmToken = create<FcmState>((set) => ({
  permission: initialPermission(),
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
        set({ permission: perm as NotifState, loading: false });
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
      await updateDoc(doc(db, 'users', user.uid), {
        fcmTokens: arrayUnion(token),
      });
      set({ permission: 'granted', loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al activar notificaciones.',
      });
    }
  },
}));
