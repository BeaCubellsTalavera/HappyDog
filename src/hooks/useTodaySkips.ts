import { create } from 'zustand';
import { createSkip as writeSkip } from '../lib/skips';
import { useTodayFeedings } from './useFeedings';
import { todayString } from '../lib/mealSlots';

interface TodaySkipsState {
  createSkip: (startHour: number, uid: string, name: string) => Promise<void>;
}

export const useTodaySkips = create<TodaySkipsState>(() => ({
  createSkip: async (startHour, uid, name) => {
    await writeSkip({ date: todayString(), startHour, uid, name });
    await useTodayFeedings.getState().reload();
  },
}));
