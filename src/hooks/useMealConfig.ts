import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { MealSlotId } from '../types';

const SCHEDULE_DOC = doc(db, 'config', 'schedule');

const DEFAULT_ENABLED: Record<MealSlotId, boolean> = {
  morning: true,
  midday: true,
  afternoon: true,
  night: true,
};

interface MealConfigState {
  enabled: Record<MealSlotId, boolean>;
  loading: boolean;
  toggle: (id: MealSlotId) => Promise<void>;
}

export const useMealConfig = create<MealConfigState>()((set, get) => {
  onSnapshot(SCHEDULE_DOC, (snap) => {
    const data = snap.data();
    set({
      enabled: (data?.enabled as Record<MealSlotId, boolean>) ?? DEFAULT_ENABLED,
      loading: false,
    });
  });

  return {
    enabled: DEFAULT_ENABLED,
    loading: true,
    toggle: async (id) => {
      const current = get().enabled;
      const newEnabled = { ...current, [id]: !current[id] };
      set({ enabled: newEnabled });
      await setDoc(SCHEDULE_DOC, { enabled: newEnabled }, { merge: true });
    },
  };
});
