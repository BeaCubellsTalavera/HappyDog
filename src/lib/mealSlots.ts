import { format } from 'date-fns';
import type { Feeding, MealSlot, MealSlotId, SlotStatus } from '../types';

/** Editable meal fields — el resto (id, bg, label) queda hardcoded por id. */
export interface MealFields {
  name: string;
  startHour: number;
  endHour: number;
}

export type MealsMap = Record<MealSlotId, MealFields>;

export const MEAL_IDS: readonly MealSlotId[] = ['morning', 'midday', 'afternoon', 'night'];

export const DEFAULT_MEALS: MealsMap = {
  morning:   { name: 'Desayuno', startHour: 8,  endHour: 13 },
  midday:    { name: 'Comida',   startHour: 13, endHour: 18 },
  afternoon: { name: 'Merienda', startHour: 18, endHour: 20 },
  night:     { name: 'Cena',     startHour: 20, endHour: 24 },
};

export const BG_BY_ID: Record<MealSlotId, string> = {
  morning:   '/meal-slots/morning.png',
  midday:    '/meal-slots/midday.png',
  afternoon: '/meal-slots/afternoon.png',
  night:     '/meal-slots/night.png',
};

export function buildSlots(meals: MealsMap): MealSlot[] {
  return MEAL_IDS
    .map((id) => ({
      id,
      bg: BG_BY_ID[id],
      ...meals[id],
    }))
    .sort((a, b) => a.startHour - b.startHour);
}

export const MEAL_SLOTS: MealSlot[] = buildSlots(DEFAULT_MEALS);

export function getActiveSlotIndex(slots: MealSlot[], now: Date): number {
  const hour = now.getHours();
  const idx = slots.findIndex((s) => hour >= s.startHour && hour < s.endHour);
  if (idx !== -1) return idx;
  return hour < slots[0].startHour ? 0 : slots.length - 1;
}

export function deriveSlotStatus(
  slot: MealSlot,
  feedings: Feeding[],
  today: string,
  now: Date
): SlotStatus {
  const hour = now.getHours();

  const hasFeed = feedings.some(
    (f) => f.dateLocal === today && f.method !== 'skipped' && f.hourLocal >= slot.startHour && f.hourLocal < slot.endHour
  );
  if (hasFeed) return 'given';

  const hasSkip = feedings.some(
    (f) => f.dateLocal === today && f.method === 'skipped' && f.hourLocal === slot.startHour
  );
  if (hasSkip) return 'skipped';

  if (hour < slot.startHour) return 'not-yet';
  // endHour 24 means until midnight; since getHours() returns 0-23, hour < 24 is always true
  if (slot.endHour === 24 || hour < slot.endHour) return 'pending';
  return 'missed';
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
