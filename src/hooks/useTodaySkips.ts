import { create } from 'zustand';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createSkip as createSkipDoc } from '../lib/skips';
import { todayString } from '../lib/mealSlots';
import type { Skip, MealSlotId } from '../types';

interface TodaySkipsState {
  skips: Skip[];
  loading: boolean;
  reload: () => Promise<void>;
  createSkip: (mealSlotId: MealSlotId, skippedBy: string, skippedByName: string) => Promise<void>;
}

export const useTodaySkips = create<TodaySkipsState>((set, get) => {
  async function reload() {
    const today = todayString();
    const snap = await getDocs(query(collection(db, 'skips'), where('date', '==', today)));
    const skips = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Skip));
    set({ skips, loading: false });
  }

  reload();

  return {
    skips: [],
    loading: true,
    reload,
    async createSkip(mealSlotId, skippedBy, skippedByName) {
      await createSkipDoc({ date: todayString(), mealSlotId, skippedBy, skippedByName });
      await get().reload();
    },
  };
});
