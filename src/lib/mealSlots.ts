import { format } from 'date-fns';
import type { Feeding, MealSlot, Skip, SlotStatus } from '../types';

export const MEAL_SLOTS: MealSlot[] = [
  { id: 'morning',   name: 'Desayuno', label: 'MAÑANA',   startHour: 0,  endHour: 13, bg: '/meal-slots/morning.png'   },
  { id: 'midday',    name: 'Comida',   label: 'MEDIODÍA', startHour: 13, endHour: 18, bg: '/meal-slots/midday.png'    },
  { id: 'afternoon', name: 'Merienda', label: 'TARDE',    startHour: 18, endHour: 20, bg: '/meal-slots/afternoon.png' },
  { id: 'night',     name: 'Cena',     label: 'NOCHE',    startHour: 20, endHour: 24, bg: '/meal-slots/night.png'     },
];

export function getActiveSlotIndex(slots: MealSlot[], now: Date): number {
  const hour = now.getHours();
  const idx = slots.findIndex((s) => hour >= s.startHour && hour < s.endHour);
  if (idx !== -1) return idx;
  return hour < slots[0].startHour ? 0 : slots.length - 1;
}

export function deriveSlotStatus(
  slot: MealSlot,
  feedings: Feeding[],
  skips: Skip[],
  today: string,
  now: Date
): SlotStatus {
  const hour = now.getHours();

  const hasFeed = feedings.some(
    (f) => f.dateLocal === today && f.hourLocal >= slot.startHour && f.hourLocal < slot.endHour
  );
  if (hasFeed) return 'given';

  const hasSkip = skips.some((s) => s.date === today && s.mealSlotId === slot.id);
  if (hasSkip) return 'skipped';

  if (hour < slot.startHour) return 'not-yet';
  // endHour 24 means until midnight; since getHours() returns 0-23, hour < 24 is always true
  if (slot.endHour === 24 || hour < slot.endHour) return 'pending';
  return 'missed';
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
