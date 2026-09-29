import type { Feeding, MealSlot, MealSlotId } from '../types';

export const SLOT_COLORS: Record<MealSlotId, string> = {
  morning: '#FB923C',
  midday: '#FCD34D',
  afternoon: '#F472B6',
  night: '#818CF8',
};

export const BUCKET_SIZE = 0.5;
const BUCKET_COUNT = Math.floor(24 / BUCKET_SIZE);

export function feedingHour(f: Feeding): number {
  const d = f.timestamp.toDate();
  return d.getHours() + d.getMinutes() / 60;
}

export type HistogramRow = { x: number } & Partial<Record<MealSlotId, number>>;

function slotForHour(h: number, slots: MealSlot[]): MealSlot | undefined {
  return slots.find((s) => h >= s.startHour && h < s.endHour);
}

export function computeSlotMeans(
  feedings: Feeding[],
  activeSlots: MealSlot[],
): Partial<Record<MealSlotId, number>> {
  const sums: Partial<Record<MealSlotId, number>> = {};
  const counts: Partial<Record<MealSlotId, number>> = {};
  for (const f of feedings) {
    const slot = activeSlots.find(
      (s) => f.hourLocal >= s.startHour && f.hourLocal < s.endHour,
    );
    if (!slot) continue;
    sums[slot.id] = (sums[slot.id] ?? 0) + feedingHour(f);
    counts[slot.id] = (counts[slot.id] ?? 0) + 1;
  }
  const means: Partial<Record<MealSlotId, number>> = {};
  for (const slot of activeSlots) {
    const c = counts[slot.id];
    if (c && c > 0) means[slot.id] = (sums[slot.id] ?? 0) / c;
  }
  return means;
}

export function buildHistogramData(
  feedings: Feeding[],
  activeSlots: MealSlot[],
): HistogramRow[] {
  const buckets: HistogramRow[] = [];
  for (let i = 0; i < BUCKET_COUNT; i++) {
    const x = i * BUCKET_SIZE;
    const row: HistogramRow = { x };
    const slot = slotForHour(x + BUCKET_SIZE / 2, activeSlots);
    if (slot) row[slot.id] = 0;
    buckets.push(row);
  }

  for (const f of feedings) {
    const h = feedingHour(f);
    const idx = Math.floor(h / BUCKET_SIZE);
    if (idx < 0 || idx >= BUCKET_COUNT) continue;
    const row = buckets[idx];
    const slot = slotForHour(row.x + BUCKET_SIZE / 2, activeSlots);
    if (!slot) continue;
    row[slot.id] = (row[slot.id] ?? 0) + 1;
  }

  return buckets;
}
