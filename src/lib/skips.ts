import { createFeeding } from './feedings';
import { MEAL_SLOTS } from './mealSlots';
import type { MealSlotId } from '../types';

interface CreateSkipInput {
  date: string;
  mealSlotId: MealSlotId;
  uid: string;
  name: string;
}

export async function createSkip({ date, mealSlotId, uid, name }: CreateSkipInput): Promise<void> {
  const slot = MEAL_SLOTS.find((s) => s.id === mealSlotId);
  if (!slot) throw new Error(`Unknown mealSlotId: ${mealSlotId}`);
  const [year, month, day] = date.split('-').map(Number);
  const timestamp = new Date(year, month - 1, day, slot.startHour, 0, 0);
  await createFeeding({ method: 'skipped', timestamp, feederUid: uid, feederName: name });
}
