import { addHours, format, parseISO, subHours } from 'date-fns';
import type { Feeding, MealSlot } from '../types';

export const DAY_CUTOFF_HOUR = 3;

export function logicalHour(calendarHour: number): number {
  return (calendarHour - DAY_CUTOFF_HOUR + 24) % 24;
}

export function logicalDate(ts: Date): string {
  return format(subHours(ts, DAY_CUTOFF_HOUR), 'yyyy-MM-dd');
}

export function logicalToday(now?: Date): string {
  return logicalDate(now ?? new Date());
}

export function calendarToday(now?: Date): string {
  return format(now ?? new Date(), 'yyyy-MM-dd');
}

export interface SlotLogicalBounds {
  logStart: number;
  logEnd: number;
}

export function slotLogicalBounds(slot: Pick<MealSlot, 'startHour' | 'endHour'>): SlotLogicalBounds {
  const startAdjusted = slot.startHour === 24 ? 0 : slot.startHour;
  const endAdjusted = slot.endHour === 24 ? 0 : slot.endHour;
  const logStart = (startAdjusted - DAY_CUTOFF_HOUR + 24) % 24;
  const raw = (endAdjusted - DAY_CUTOFF_HOUR + 24) % 24;
  // endHour que mapea a logical 0 significa "fin del día lógico" (endHour === DAY_CUTOFF_HOUR).
  const logEnd = raw === 0 ? 24 : raw;
  return { logStart, logEnd };
}

export function feedingInSlot(f: Feeding, slot: Pick<MealSlot, 'startHour' | 'endHour'>): boolean {
  const { logStart, logEnd } = slotLogicalBounds(slot);
  const logH = logicalHour(f.hourLocal);
  return logH >= logStart && logH < logEnd;
}

/**
 * Construye el timestamp absoluto de una hora dentro de un slot para un día lógico.
 * Horas < DAY_CUTOFF_HOUR pertenecen a la madrugada del día calendar siguiente (mismo día lógico).
 */
export function slotToAbsoluteTimestamp(logicalDayStr: string, hourInSlot: number): Date {
  return addHours(parseISO(logicalDayStr), DAY_CUTOFF_HOUR + logicalHour(hourInSlot));
}
