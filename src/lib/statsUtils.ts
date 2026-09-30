import type { Feeding, MealSlot, MealSlotId } from '../types';

export const SLOT_COLORS: Record<MealSlotId, string> = {
  morning: '#FB923C',
  midday: '#FCD34D',
  afternoon: '#F472B6',
  night: '#818CF8',
};

export function feedingHour(f: Feeding): number {
  const d = f.timestamp.toDate();
  return d.getHours() + d.getMinutes() / 60;
}

export function formatHourRange(startHour: number, sizeHours: number): string {
  const fmt = (h: number): string => {
    const total = Math.round(h * 60);
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  return `${fmt(startHour)}–${fmt(startHour + sizeHours)}`;
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

