import type { Feeding, MealSlot, MealSlotId } from '../types';
import { DAY_CUTOFF_HOUR, feedingInSlot, logicalHour } from './logicalDay';

export const SLOT_COLORS: Record<MealSlotId, string> = {
  morning: '#FB923C',
  midday: '#FCD34D',
  afternoon: '#F472B6',
  night: '#818CF8',
};

/** Color para buckets con feedings que no caen en ningún slot activo (huérfanas por config). */
export const ORPHAN_BUCKET_COLOR = '#D1D5DB';

/** Color para feedings marcados explícitamente con outOfSlot=true. */
export const OUT_OF_SLOT_COLOR = '#9CA3AF';

/**
 * Devuelve la hora del feeding en espacio LÓGICO (0..24), donde 0 = DAY_CUTOFF_HOUR calendar.
 */
export function feedingHour(f: Feeding): number {
  const d = f.timestamp.toDate();
  return logicalHour(d.getHours()) + d.getMinutes() / 60;
}

/**
 * Formatea un rango horario en calendar time. Soporta wrap alrededor de medianoche
 * (p. ej. 23:50–00:10). `startHour` y `startHour + sizeHours` se toman mod 24.
 */
export function formatHourRange(startHour: number, sizeHours: number): string {
  const fmt = (h: number): string => {
    const wrapped = ((h % 24) + 24) % 24;
    const total = Math.round(wrapped * 60);
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  return `${fmt(startHour)}–${fmt(startHour + sizeHours)}`;
}

/**
 * Convierte una hora en espacio lógico (0..24) a calendar hour (0..24).
 * logical 0 → calendar DAY_CUTOFF_HOUR.
 */
export function logicalToCalendarHour(logicalH: number): number {
  return (logicalH + DAY_CUTOFF_HOUR) % 24;
}

export function computeSlotMeans(
  feedings: Feeding[],
  activeSlots: MealSlot[],
): Partial<Record<MealSlotId, number>> {
  const sums: Partial<Record<MealSlotId, number>> = {};
  const counts: Partial<Record<MealSlotId, number>> = {};
  for (const f of feedings) {
    const slot = activeSlots.find((s) => feedingInSlot(f, s));
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

