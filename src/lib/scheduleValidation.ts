import { MEAL_IDS, type MealsMap } from './mealSlots';
import { slotLogicalBounds } from './logicalDay';
import { windowLabel } from './timeFormat';
import type { MealSlotId } from '../types';

export interface ValidationResult {
  errorsBySlot: Record<MealSlotId, string[]>;
  globalErrors: string[];
  ok: boolean;
}

type EnabledMap = Record<MealSlotId, boolean>;

/** Un rango [start, end) es válido si difiere y su representación lógica avanza (logEnd > logStart). */
function spanValid(m: { startHour: number; endHour: number }): boolean {
  if (m.startHour === m.endHour) return false;
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

/** Valida un draft completo (enabled + meals). Se llama en cada render del editor. */
export function validateSchedule(enabled: EnabledMap, meals: MealsMap): ValidationResult {
  const errorsBySlot: Record<MealSlotId, string[]> = {
    morning: [],
    midday: [],
    afternoon: [],
    night: [],
  };
  const globalErrors: string[] = [];

  // 1. Reglas por slot (siempre, ON u OFF).
  for (const id of MEAL_IDS) {
    const m = meals[id];
    if (!m.name || m.name.trim().length === 0) {
      errorsBySlot[id].push('El nombre no puede estar vacío');
    }
    if (!Number.isInteger(m.startHour) || m.startHour < 0 || m.startHour > 23) {
      errorsBySlot[id].push('Hora de inicio inválida');
    }
    // endHour acepta 0..23; se admite 24 defensivamente por retrocompat, aunque parseMeals lo normaliza a 0.
    if (
      !Number.isInteger(m.endHour) ||
      m.endHour < 0 ||
      (m.endHour > 23 && m.endHour !== 24)
    ) {
      errorsBySlot[id].push('Hora de fin inválida');
    }
    if (
      Number.isFinite(m.startHour) &&
      Number.isFinite(m.endHour) &&
      !spanValid(m)
    ) {
      errorsBySlot[id].push('La hora de fin debe ser posterior a la de inicio en el día lógico');
    }
  }

  // 2. Mínimo 1 slot enabled.
  const enabledCount = MEAL_IDS.filter((id) => enabled[id]).length;
  if (enabledCount < 1) {
    globalErrors.push('Debe haber al menos una toma activa');
  }

  // 3. Sin solapamiento entre ninguno de los 4 slots (ON u OFF).
  for (let i = 0; i < MEAL_IDS.length; i++) {
    for (let j = i + 1; j < MEAL_IDS.length; j++) {
      const a = meals[MEAL_IDS[i]];
      const b = meals[MEAL_IDS[j]];
      // Sólo revisamos overlap si los rangos son individualmente válidos.
      if (!spanValid(a) || !spanValid(b)) continue;
      if (overlaps(a, b)) {
        const rangeA = windowLabel(a.startHour, a.endHour);
        const rangeB = windowLabel(b.startHour, b.endHour);
        errorsBySlot[MEAL_IDS[i]].push(`Solapa con ${b.name} (${rangeB})`);
        errorsBySlot[MEAL_IDS[j]].push(`Solapa con ${a.name} (${rangeA})`);
      }
    }
  }

  const hasSlotErrors = MEAL_IDS.some((id) => errorsBySlot[id].length > 0);
  return {
    errorsBySlot,
    globalErrors,
    ok: !hasSlotErrors && globalErrors.length === 0,
  };
}
