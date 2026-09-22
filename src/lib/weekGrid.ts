import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Feeding, MealSlot, SlotStatus } from '../types';
import { deriveSlotStatus } from './mealSlots';

export type CellPosition = 'single' | 'first' | 'middle' | 'last';

export interface CellData {
  status: SlotStatus;
  position: CellPosition;
}

export interface DayColumn {
  dayStr: string;
  label: string;
  isToday: boolean;
  cells: CellData[];
}

export function deriveDaySlotStatus(
  slot: MealSlot,
  feedings: Feeding[],
  dayStr: string,
  todayStr: string,
  now: Date,
): SlotStatus {
  if (dayStr === todayStr) return deriveSlotStatus(slot, feedings, todayStr, now);

  const hasFeed = feedings.some(
    (f) =>
      f.dateLocal === dayStr &&
      f.method !== 'skipped' &&
      f.hourLocal >= slot.startHour &&
      f.hourLocal < slot.endHour,
  );
  if (hasFeed) return 'given';

  const hasSkip = feedings.some(
    (f) =>
      f.dateLocal === dayStr &&
      f.method === 'skipped' &&
      f.hourLocal === slot.startHour,
  );
  if (hasSkip) return 'skipped';

  return 'missed';
}

function groupStatuses(statuses: SlotStatus[]): CellData[] {
  // not-yet and pending are never grouped into pills (future slots, no history)
  const norm = statuses.map((s) =>
    s === 'pending' || s === 'not-yet' ? null : s,
  );
  return statuses.map((status, i) => {
    const curr = norm[i];
    if (curr === null) return { status, position: 'single' as CellPosition };
    const samePrev = i > 0 && norm[i - 1] === curr;
    const sameNext = i < norm.length - 1 && norm[i + 1] === curr;
    let position: CellPosition;
    if (!samePrev && !sameNext) position = 'single';
    else if (!samePrev) position = 'first';
    else if (!sameNext) position = 'last';
    else position = 'middle';
    return { status, position };
  });
}

export function buildWeekGrid(
  slots: MealSlot[],
  feedings: Feeding[],
  todayStr: string,
  now: Date,
): DayColumn[] {
  const today = parseISO(todayStr);
  return Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const dayStr = format(date, 'yyyy-MM-dd');
    const label = format(date, 'EEE', { locale: es });
    const statuses = slots.map((slot) =>
      deriveDaySlotStatus(slot, feedings, dayStr, todayStr, now),
    );
    return { dayStr, label, isToday: dayStr === todayStr, cells: groupStatuses(statuses) };
  });
}
