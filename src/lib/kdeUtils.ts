import type { Feeding, MealSlot, MealSlotId } from '../types';

export const SLOT_COLORS: Record<MealSlotId, string> = {
  morning: '#FB923C',
  midday: '#FCD34D',
  afternoon: '#F472B6',
  night: '#818CF8',
};

const GRID_STEP = 0.5;
const GRID_MAX = 23.5;

export const KDE_GRID_X: number[] = Array.from(
  { length: Math.floor(GRID_MAX / GRID_STEP) + 1 },
  (_, i) => i * GRID_STEP,
);

export function feedingHour(f: Feeding): number {
  const d = f.timestamp.toDate();
  return d.getHours() + d.getMinutes() / 60;
}

export function computeKDE(sample: number[], xs: number[], h: number): number[] {
  if (sample.length === 0) return xs.map(() => 0);
  // Sin dividir entre sample.length → la curva integra al número de muestras.
  // Así la altura relativa entre curvas refleja el volumen de tomas de cada
  // slot: más tomas totales = pico más alto (a igual dispersión).
  const norm = 1 / (h * Math.sqrt(2 * Math.PI));
  return xs.map((x) => {
    let sum = 0;
    for (const s of sample) {
      const u = (x - s) / h;
      sum += Math.exp(-0.5 * u * u);
    }
    return sum * norm;
  });
}

export type DensityRow = { x: number } & Partial<Record<MealSlotId, number>>;

export function buildDensityData(
  feedings: Feeding[],
  activeSlots: MealSlot[],
  bandwidth = 0.6,
): DensityRow[] {
  const bySlot: Record<string, number[]> = {};
  for (const slot of activeSlots) bySlot[slot.id] = [];

  for (const f of feedings) {
    const slot = activeSlots.find(
      (s) => f.hourLocal >= s.startHour && f.hourLocal < s.endHour,
    );
    if (!slot) continue;
    bySlot[slot.id].push(feedingHour(f));
  }

  const densities: Record<string, number[]> = {};
  for (const slot of activeSlots) {
    densities[slot.id] = computeKDE(bySlot[slot.id], KDE_GRID_X, bandwidth);
  }

  return KDE_GRID_X.map((x, i) => {
    const row: DensityRow = { x };
    for (const slot of activeSlots) {
      row[slot.id] = densities[slot.id][i];
    }
    return row;
  });
}
