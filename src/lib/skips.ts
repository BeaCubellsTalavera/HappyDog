import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { MealSlotId } from '../types';

interface CreateSkipInput {
  date: string;
  mealSlotId: MealSlotId;
  skippedBy: string;
  skippedByName: string;
}

export async function createSkip(input: CreateSkipInput): Promise<void> {
  await addDoc(collection(db, 'skips'), {
    ...input,
    skippedAt: serverTimestamp(),
  });
}
