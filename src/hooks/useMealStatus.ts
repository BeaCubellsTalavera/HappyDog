import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { MEAL_SLOTS, deriveSlotStatus } from '../lib/mealSlots';
import { useTodayFeedings } from './useFeedings';
import { useTodaySkips } from './useTodaySkips';
import type { SlotStatus } from '../types';

export function useMealStatus(): SlotStatus[] {
  const feedings = useTodayFeedings((s) => s.feedings);
  const skips = useTodaySkips((s) => s.skips);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const today = format(now, 'yyyy-MM-dd');
  return MEAL_SLOTS.map((slot) => deriveSlotStatus(slot, feedings, skips, today, now));
}
