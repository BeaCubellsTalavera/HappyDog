import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import type { Feeding } from '../types';
import { getTodayFeedings } from '../lib/feedings';
import { calendarToday, logicalToday } from '../lib/logicalDay';
import { useHistory, syncTodayInHistory } from './useHistory';
import { auth } from '../lib/firebase';

interface TodayFeedingsState {
  feedings: Feeding[];
  loading: boolean;
  reload: () => Promise<void>;
}

export const useTodayFeedings = create<TodayFeedingsState>((set, get) => ({
  feedings: [],
  loading: true,
  reload: async () => {
    const isFirstLoad = get().loading;
    const lToday = logicalToday();
    const cToday = calendarToday();

    const fetched = await getTodayFeedings(lToday);
    set({ feedings: fetched, loading: false });
    // History→Lista agrupa por dateLocal calendar: sólo se le pasan los del calendar-today.
    // Los de madrugada calendar-tomorrow entran a History por su propio onSnapshot vivo.
    syncTodayInHistory(cToday, fetched.filter((f) => f.dateLocal === cToday));
    if (isFirstLoad) {
      useHistory.getState().load();
    }
  },
}));

// Carga inmediata si ya hay sesión (auth.currentUser síncrono desde localStorage)
if (auth.currentUser) useTodayFeedings.getState().reload();
// Cubre login nuevo y confirmación del estado inicial
onAuthStateChanged(auth, (user) => {
  if (user) useTodayFeedings.getState().reload();
});
