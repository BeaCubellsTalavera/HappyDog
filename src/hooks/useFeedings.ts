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

// Inserta un feeding llegado por push antes de que onSnapshot lo reciba.
// onSnapshot reemplazará la lista completa cuando llegue — sin duplicados
// porque sustituye el array entero.
export function injectFeeding(feeding: Feeding) {
  const { feedings } = store.getState();
  if (feedings.some((f) => f.id === feeding.id)) return;
  const updated = [feeding, ...feedings].sort(
    (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
  );
  store.setState({ feedings: updated });
}

export function useFeedings(limit = 200) {
  useEffect(() => {
    return subscribeFeedings(
      limit,
      (feedings) => store.setState({ feedings, loading: false }),
      () => store.setState({ feedings: [], loading: false })
    );
  }, [limit]);

  return store();
}
