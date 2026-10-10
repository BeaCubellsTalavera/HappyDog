import type { Feeding, MealSlot, MealSlotId, SlotStatus } from '../types';
import {
  DAY_CUTOFF_HOUR,
  feedingInSlot,
  logicalDate,
  logicalHour,
  logicalToday,
  slotLogicalBounds,
} from './logicalDay';

/** Editable meal fields — el resto (id, bg, gradient) se calcula en render. */
export interface MealFields {
  name: string;
  startHour: number;
  endHour: number;
}

export type MealsMap = Partial<Record<MealSlotId, MealFields>>;

export const MEAL_IDS: readonly MealSlotId[] = ['slot1', 'slot2', 'slot3', 'slot4'];

export const DEFAULT_MEALS: MealsMap = {
  slot1: { name: 'Desayuno',  startHour: 8,  endHour: 13 },
  slot2: { name: 'Comida',    startHour: 13, endHour: 18 },
  slot3: { name: 'Merienda',  startHour: 18, endHour: 20 },
  slot4: { name: 'Cena',      startHour: 20, endHour: 0  },
};

// ─── Heurística de imagen gastronómica ───────────────────────────────────────

const BG_IMAGES = [
  '/meal-slots/morning.png',
  '/meal-slots/midday.png',
  '/meal-slots/afternoon.png',
  '/meal-slots/night.png',
];

const BG_GRADIENTS = [
  'from-orange-300 via-yellow-200 to-sky-300',
  'from-sky-300 via-blue-200 to-sky-400',
  'from-orange-400 via-rose-300 to-purple-400',
  'from-indigo-900 via-blue-900 to-slate-900',
];

function naturalBucket(logStart: number): number {
  if (logStart < 7) return 0;   // 03:00–10:00 → morning
  if (logStart < 10) return 1;  // 10:00–13:00 → midday
  if (logStart < 15) return 2;  // 13:00–18:00 → afternoon
  return 3;                      // 18:00–03:00 → night
}

/**
 * Asigna un índice de imagen (0–3) a cada slot sin repeticiones.
 * Los slots deben llegar ordenados por logStart ascendente.
 * Algoritmo: pase backward (empuja colisiones atrás) + pase forward (corrige clamp).
 */
function computeSlotBuckets(slots: { startHour: number }[]): number[] {
  const n = slots.length;
  if (n === 0) return [];
  const b = slots.map(s => naturalBucket(logicalHour(s.startHour)));
  // Pase backward: si dos slots adyacentes tienen el mismo bucket, el izquierdo retrocede
  for (let i = n - 2; i >= 0; i--) {
    if (b[i] >= b[i + 1]) b[i] = Math.max(0, b[i + 1] - 1);
  }
  // Pase forward: corrige colisiones restantes tras el clamp a 0
  for (let i = 1; i < n; i++) {
    if (b[i] <= b[i - 1]) b[i] = Math.min(3, b[i - 1] + 1);
  }
  return b;
}

// Exports para ScheduleSettings (necesita bg/gradient del draft antes de buildSlots)
export function getBgImages(slots: { startHour: number }[]): string[] {
  return computeSlotBuckets(slots).map(i => BG_IMAGES[i]);
}
export function getBgGradients(slots: { startHour: number }[]): string[] {
  return computeSlotBuckets(slots).map(i => BG_GRADIENTS[i]);
}

// ─── buildSlots ───────────────────────────────────────────────────────────────

export function buildSlots(meals: MealsMap): MealSlot[] {
  const unsorted = (Object.keys(meals) as MealSlotId[]).map(id => ({
    id,
    bg: '',
    gradient: '',
    ...meals[id]!,
  }));
  const sorted = unsorted.sort(
    (a, b) => slotLogicalBounds(a).logStart - slotLogicalBounds(b).logStart,
  );
  const buckets = computeSlotBuckets(sorted);
  return sorted.map((slot, i) => ({
    ...slot,
    bg: BG_IMAGES[buckets[i]],
    gradient: BG_GRADIENTS[buckets[i]],
  }));
}

export const MEAL_SLOTS: MealSlot[] = buildSlots(DEFAULT_MEALS);

// ─── MealCount & defaults ─────────────────────────────────────────────────────

export type MealCount = 1 | 2 | 3 | 4;
export const DEFAULT_MEAL_COUNT: MealCount = 2;

const SLOT_DEFAULTS: Record<MealCount, MealFields[]> = {
  1: [{ name: 'Comida', startHour: DAY_CUTOFF_HOUR, endHour: DAY_CUTOFF_HOUR }],
  2: [
    { name: 'Comida', startHour: 3,  endHour: 15 },
    { name: 'Cena',   startHour: 15, endHour: 3  },
  ],
  3: [
    { name: 'Desayuno', startHour: 3,  endHour: 10 },
    { name: 'Comida',   startHour: 10, endHour: 18 },
    { name: 'Cena',     startHour: 18, endHour: 3  },
  ],
  4: [
    { name: 'Desayuno', startHour: 3,  endHour: 10 },
    { name: 'Almuerzo', startHour: 10, endHour: 13 },
    { name: 'Comida',   startHour: 13, endHour: 18 },
    { name: 'Cena',     startHour: 18, endHour: 3  },
  ],
};

export function computeDefaultSlots(count: MealCount): MealsMap {
  const defs = SLOT_DEFAULTS[count];
  const out: MealsMap = {};
  MEAL_IDS.slice(0, count).forEach((id, i) => { out[id] = { ...defs[i] }; });
  return out;
}

// ─── Runtime helpers ──────────────────────────────────────────────────────────

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
