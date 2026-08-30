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
    // Merge: preserve any feedings injected optimistically while the query was in flight
    set((s) => {
      const extra = s.feedings.filter((f) => !fetched.some((ff) => ff.id === f.id));
      const merged = [...fetched, ...extra].sort(
        (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
      );
      return { feedings: merged, loading: false };
    });
    const feedings = useTodayFeedings.getState().feedings;
    syncTodayInHistory(todayStr, feedings);
    if (isFirstLoad) {
      useHistory.getState().load();
    }
  },
}));

// Cargar solo cuando Firebase confirma que hay usuario autenticado
onAuthStateChanged(auth, (user) => {
  if (user) useTodayFeedings.getState().reload();
});

export function injectTodayFeeding(feeding: Feeding) {
  const todayStr = today();
  if (feeding.dateLocal !== todayStr) return;
  const { feedings } = useTodayFeedings.getState();
  if (feedings.some((f) => f.id === feeding.id)) return;
  const updated = [feeding, ...feedings].sort(
    (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
  );
  useTodayFeedings.setState({ feedings: updated });
  syncTodayInHistory(todayStr, updated);
}
