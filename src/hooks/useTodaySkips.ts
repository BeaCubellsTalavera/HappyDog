import { create } from 'zustand';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
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

if (auth.currentUser) useTodaySkips.getState().reload();
onAuthStateChanged(auth, (user) => {
  if (user) useTodaySkips.getState().reload();
});
