import type { Feeding, MealSlot, MealSlotId, SlotStatus } from '../types';
import {
  feedingInSlot,
  logicalDate,
  logicalHour,
  logicalToday,
  slotLogicalBounds,
} from './logicalDay';

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
    .sort((a, b) => slotLogicalBounds(a).logStart - slotLogicalBounds(b).logStart);
}

export const MEAL_SLOTS: MealSlot[] = buildSlots(DEFAULT_MEALS);

export function getActiveSlotIndex(slots: MealSlot[], now: Date): number {
  const logNow = logicalHour(now.getHours());
  const ordered = [...slots].sort(
    (a, b) => slotLogicalBounds(a).logStart - slotLogicalBounds(b).logStart,
  );
  const idx = ordered.findIndex((s) => {
    const { logStart, logEnd } = slotLogicalBounds(s);
    return logNow >= logStart && logNow < logEnd;
  });
  if (idx !== -1) return slots.indexOf(ordered[idx]);
  const firstLogStart = slotLogicalBounds(ordered[0]).logStart;
  return logNow < firstLogStart
    ? slots.indexOf(ordered[0])
    : slots.indexOf(ordered[ordered.length - 1]);
}

export function deriveSlotStatus(
  slot: MealSlot,
  feedings: Feeding[],
  today: string,
  now: Date
): SlotStatus {
  const logNow = logicalHour(now.getHours());
  const { logStart, logEnd } = slotLogicalBounds(slot);

  const hasFeed = feedings.some(
    (f) =>
      f.method !== 'skipped' &&
      logicalDate(f.timestamp.toDate()) === today &&
      feedingInSlot(f, slot),
  );
  if (hasFeed) return 'given';

  const hasSkip = feedings.some(
    (f) =>
      f.method === 'skipped' &&
      logicalDate(f.timestamp.toDate()) === today &&
      logicalHour(f.hourLocal) === logStart,
  );
  if (hasSkip) return 'skipped';

  if (logNow < logStart) return 'not-yet';
  if (logNow < logEnd) return 'pending';
  return 'missed';
}

export function todayString(): string {
  return logicalToday();
}
