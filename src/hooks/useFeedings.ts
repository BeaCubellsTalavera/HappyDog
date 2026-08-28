import { useEffect } from 'react';
import { create } from 'zustand';
import type { Feeding } from '../types';
import { subscribeFeedings } from '../lib/feedings';

interface FeedingsState {
  feedings: Feeding[];
  loading: boolean;
}

const store = create<FeedingsState>(() => ({
  feedings: [],
  loading: true,
}));

export function useFeedings(limit = 50) {
  useEffect(() => {
    return subscribeFeedings(
      limit,
      (feedings) => store.setState({ feedings, loading: false }),
      () => store.setState({ feedings: [], loading: false })
    );
  }, [limit]);

  return store();
}
