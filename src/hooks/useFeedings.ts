import { create } from 'zustand';
import { format } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';
import type { Feeding } from '../types';
import { getTodayFeedings } from '../lib/feedings';
import { useHistory, syncTodayInHistory } from './useHistory';
import { auth } from '../lib/firebase';

interface TodayFeedingsState {
  feedings: Feeding[];
  loading: boolean;
  reload: () => Promise<void>;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

export const useTodayFeedings = create<TodayFeedingsState>((set, get) => ({
  feedings: [],
  loading: true,
  reload: async () => {
    const isFirstLoad = get().loading;
    const todayStr = today();

    const fetched = await getTodayFeedings(todayStr);
    set({ feedings: fetched, loading: false });
    syncTodayInHistory(todayStr, fetched);
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

