import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from './firebase';
import type { Feeding } from '../types';

type CreateFeedingInput = {
  timestamp: Date;
  feederUid: string;
  feederName: string;
  method: 'nfc' | 'manual';
};

export async function createFeeding(input: CreateFeedingInput): Promise<void> {
  const d = input.timestamp;
  await addDoc(collection(db, 'feedings'), {
    timestamp: d,
    dateLocal: format(d, 'yyyy-MM-dd'),
    hourLocal: d.getHours(),
    feederUid: input.feederUid,
    feederName: input.feederName,
    method: input.method,
    createdAt: serverTimestamp(),
  });
}

export function subscribeFeedings(
  limitCount: number,
  onChange: (feedings: Feeding[]) => void
): () => void {
  const q = query(
    collection(db, 'feedings'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    const feedings = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp:
        (d.data().timestamp as { toDate?: () => Date } | null)?.toDate?.() ??
        new Date(),
    })) as Feeding[];
    onChange(feedings);
  });
}
