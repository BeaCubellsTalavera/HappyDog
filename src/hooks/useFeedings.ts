import { create } from 'zustand';
import { format } from 'date-fns';
import type { Feeding } from '../types';
import { getTodayFeedings } from '../lib/feedings';
import { useHistory } from './useHistory';

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
    const feedings = await getTodayFeedings(today());
    set({ feedings, loading: false });
    // Prefetch history in background after the initial load so Historia tab
    // is ready by the time the user navigates there.
    if (isFirstLoad) {
      useHistory.getState().load();
    }
  },
}));

// Trigger initial load as soon as this module is imported.
useTodayFeedings.getState().reload();

export function injectTodayFeeding(feeding: Feeding) {
  const { feedings } = useTodayFeedings.getState();
  if (feedings.some((f) => f.id === feeding.id)) return;
  if (feeding.dateLocal !== today()) return;
  const updated = [feeding, ...feedings].sort(
    (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
  );
  useTodayFeedings.setState({ feedings: updated });
}
