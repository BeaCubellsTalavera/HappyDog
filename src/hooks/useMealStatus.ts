import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { buildSlots, deriveSlotStatus } from '../lib/mealSlots';
import { useTodayFeedings } from './useFeedings';
import { useMealConfig } from './useMealConfig';
import type { MealSlot, SlotStatus } from '../types';

export function useMealStatus(): { slots: MealSlot[]; statuses: SlotStatus[] } {
  const feedings = useTodayFeedings((s) => s.feedings);
  const meals = useMealConfig((s) => s.meals);
  const enabled = useMealConfig((s) => s.enabled);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const slots = useMemo(
    () => buildSlots(meals).filter((s) => enabled[s.id]),
    [meals, enabled],
  );
  const today = format(now, 'yyyy-MM-dd');
  const statuses = slots.map((slot) => deriveSlotStatus(slot, feedings, today, now));
  return { slots, statuses };
}
