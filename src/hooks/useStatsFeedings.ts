import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import type { Feeding } from '../types';
import { getStatsFeedings } from '../lib/feedings';
import { auth } from '../lib/firebase';

interface StatsFeedingsState {
  feedings: Feeding[];
  loading: boolean;
  loaded: boolean;
  reload: () => Promise<void>;
}

export const useStatsFeedings = create<StatsFeedingsState>((set) => ({
  feedings: [],
  loading: false,
  loaded: false,
  reload: async () => {
    set({ loading: true });
    const all = await getStatsFeedings(300);
    const feedings = all.filter((f) => f.method !== 'skipped');
    set({ feedings, loading: false, loaded: true });
  },
}));

onAuthStateChanged(auth, (user) => {
  if (!user) {
    useStatsFeedings.setState({ feedings: [], loading: false, loaded: false });
  }
});
