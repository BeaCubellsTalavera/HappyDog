import { create } from 'zustand';
import { format } from 'date-fns';
import type { Feeding } from '../types';
import { getTodayFeedings } from '../lib/feedings';
import { useHistory, syncTodayInHistory } from './useHistory';

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
    const feedings = await getTodayFeedings(todayStr);
    set({ feedings, loading: false });
    syncTodayInHistory(todayStr, feedings);
    if (isFirstLoad) {
      useHistory.getState().load();
    }
  },
}));

// Trigger initial load as soon as this module is imported.
useTodayFeedings.getState().reload();

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
