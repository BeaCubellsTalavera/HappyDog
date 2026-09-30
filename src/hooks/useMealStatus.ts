import { useEffect, useMemo, useState } from 'react';
import { buildSlots, deriveSlotStatus } from '../lib/mealSlots';
import { logicalToday } from '../lib/logicalDay';
import { useTodayFeedings } from './useFeedings';
import { useMealConfig } from './useMealConfig';
import type { MealSlot, SlotStatus } from '../types';

export function useMealStatus(): { slots: MealSlot[]; statuses: SlotStatus[] } {
  const feedings = useTodayFeedings((s) => s.feedings);
  const meals = useMealConfig((s) => s.meals);
  const enabled = useMealConfig((s) => s.enabled);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let prevLogicalToday = logicalToday(new Date());
    const interval = setInterval(() => {
      const nextNow = new Date();
      const nextLogicalToday = logicalToday(nextNow);
      // Si al pasar 04:00 (o cualquier medianoche del día lógico) cambió el
      // día operativo, recargamos el store de "hoy" para reflejar el nuevo
      // slot activo sin exigir refresh manual.
      if (nextLogicalToday !== prevLogicalToday) {
        prevLogicalToday = nextLogicalToday;
        useTodayFeedings.getState().reload();
      }
      setNow(nextNow);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const slots = useMemo(
    () => buildSlots(meals).filter((s) => enabled[s.id]),
    [meals, enabled],
  );
  const today = logicalToday(now);
  const statuses = slots.map((slot) => deriveSlotStatus(slot, feedings, today, now));
  return { slots, statuses };
}
