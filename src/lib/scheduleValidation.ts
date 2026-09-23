import { MEAL_IDS, type MealsMap } from './mealSlots';
import type { MealSlotId } from '../types';

export interface ValidationResult {
  errorsBySlot: Record<MealSlotId, string[]>;
  globalErrors: string[];
  ok: boolean;
}

type EnabledMap = Record<MealSlotId, boolean>;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatHour(h: number): string {
  if (h === 24) return '24:00';
  return `${pad(h)}:00`;
}

function overlaps(a: { startHour: number; endHour: number }, b: { startHour: number; endHour: number }): boolean {
  return Math.max(a.startHour, b.startHour) < Math.min(a.endHour, b.endHour);
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
    if (!Number.isInteger(m.endHour) || m.endHour < 1 || m.endHour > 24) {
      errorsBySlot[id].push('Hora de fin inválida');
    }
    if (Number.isFinite(m.startHour) && Number.isFinite(m.endHour) && m.endHour <= m.startHour) {
      errorsBySlot[id].push('La hora de fin debe ser posterior a la de inicio');
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
      if (a.endHour <= a.startHour || b.endHour <= b.startHour) continue;
      if (overlaps(a, b)) {
        const rangeA = `${formatHour(a.startHour)}–${formatHour(a.endHour)}`;
        const rangeB = `${formatHour(b.startHour)}–${formatHour(b.endHour)}`;
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
