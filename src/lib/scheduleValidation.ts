import { MEAL_IDS, type MealsMap, type MealCount } from './mealSlots';
import { slotLogicalBounds } from './logicalDay';
import { windowLabel } from './timeFormat';
import type { MealSlotId } from '../types';

export interface ValidationResult {
  errorsBySlot: Record<MealSlotId, string[]>;
  globalErrors: string[];
  ok: boolean;
}

function spanValid(m: { startHour: number; endHour: number }): boolean {
  const { logStart, logEnd } = slotLogicalBounds(m);
  return logEnd > logStart;
}

function overlaps(
  a: { startHour: number; endHour: number },
  b: { startHour: number; endHour: number },
): boolean {
  const ba = slotLogicalBounds(a);
  const bb = slotLogicalBounds(b);
  return Math.max(ba.logStart, bb.logStart) < Math.min(ba.logEnd, bb.logEnd);
}

/** Valida el draft de las primeras `mealCount` tomas. */
export function validateSchedule(mealCount: MealCount, meals: MealsMap): ValidationResult {
  const activeIds = MEAL_IDS.slice(0, mealCount);
  const errorsBySlot = Object.fromEntries(
    MEAL_IDS.map(id => [id, [] as string[]])
  ) as Record<MealSlotId, string[]>;
  const globalErrors: string[] = [];

  for (const id of activeIds) {
    const m = meals[id];
    if (!m.name || m.name.trim().length === 0) {
      errorsBySlot[id].push('El nombre no puede estar vacío');
    }
    if (!Number.isInteger(m.startHour) || m.startHour < 0 || m.startHour > 23) {
      errorsBySlot[id].push('Hora de inicio inválida');
    }
    if (
      !Number.isInteger(m.endHour) ||
      m.endHour < 0 ||
      (m.endHour > 23 && m.endHour !== 24)
    ) {
      errorsBySlot[id].push('Hora de fin inválida');
    }
    if (Number.isFinite(m.startHour) && Number.isFinite(m.endHour) && !spanValid(m)) {
      errorsBySlot[id].push('La hora de fin debe ser posterior a la de inicio en el día lógico');
    }
  }

  for (let i = 0; i < activeIds.length; i++) {
    for (let j = i + 1; j < activeIds.length; j++) {
      const a = meals[activeIds[i]];
      const b = meals[activeIds[j]];
      if (!spanValid(a) || !spanValid(b)) continue;
      if (overlaps(a, b)) {
        const rangeA = windowLabel(a.startHour, a.endHour);
        const rangeB = windowLabel(b.startHour, b.endHour);
        errorsBySlot[activeIds[i]].push(`Solapa con ${b.name} (${rangeB})`);
        errorsBySlot[activeIds[j]].push(`Solapa con ${a.name} (${rangeA})`);
      }
    }
  }

  const hasSlotErrors = activeIds.some((id) => errorsBySlot[id].length > 0);
  return {
    errorsBySlot,
    globalErrors,
    ok: !hasSlotErrors && globalErrors.length === 0,
  };
}
