import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MEAL_SLOTS, deriveSlotStatus } from '../lib/mealSlots';
import { useTodayFeedings } from './useFeedings';
import { useTodaySkips } from './useTodaySkips';
import { useMealConfig } from './useMealConfig';
import type { MealSlot, SlotStatus } from '../types';

export function useMealStatus(): { slots: MealSlot[]; statuses: SlotStatus[] } {
  const feedings = useTodayFeedings((s) => s.feedings);
  const skips = useTodaySkips((s) => s.skips);
  const enabled = useMealConfig((s) => s.enabled);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  const slots = MEAL_SLOTS.filter((s) => enabled[s.id]);
  const statuses = slots.map((slot) => deriveSlotStatus(slot, feedings, skips, today, now));
  return { slots, statuses };
}
