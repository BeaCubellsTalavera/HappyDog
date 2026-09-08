import { create } from 'zustand';
import { createSkip as writeSkip } from '../lib/skips';
import { useTodayFeedings } from './useFeedings';
import { todayString } from '../lib/mealSlots';
import type { MealSlotId } from '../types';

interface TodaySkipsState {
  createSkip: (mealSlotId: MealSlotId, uid: string, name: string) => Promise<void>;
}

export const useTodaySkips = create<TodaySkipsState>(() => ({
  createSkip: async (mealSlotId, uid, name) => {
    await writeSkip({ date: todayString(), mealSlotId, uid, name });
    await useTodayFeedings.getState().reload();
  },
}));
