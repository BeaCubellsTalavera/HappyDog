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
import type { Feeding, NewFeeding } from '../types';

// Evita duplicados si el usuario pulsa varias veces seguidas (red lenta, re-mount).
// Solo aplica a feedings "de ahora" (NFC + botón inmediato), no a registros manuales
// de horas pasadas — esos tienen timestamp > 60 s en el pasado.
let lastImmediateFeedAt = 0;
const IMMEDIATE_DEBOUNCE_MS = 15_000;

type CreateFeedingInput = {
  timestamp: Date;
  feederUid: string;
  feederName: string;
  method: 'nfc' | 'manual';
};

export async function createFeeding(input: CreateFeedingInput): Promise<void> {
  const d = input.timestamp;
  const now = Date.now();

  const isImmediate = now - d.getTime() < 60_000;
  if (isImmediate) {
    if (now - lastImmediateFeedAt < IMMEDIATE_DEBOUNCE_MS) return;
    lastImmediateFeedAt = now;
  }

  const newDoc: NewFeeding = {
    timestamp: d,
    dateLocal: format(d, 'yyyy-MM-dd'),
    hourLocal: d.getHours(),
    feederUid: input.feederUid,
    feederName: input.feederName,
    method: input.method,
    createdAt: serverTimestamp(),
  };
  await addDoc(collection(db, 'feedings'), newDoc);
}

export function subscribeFeedings(
  limitCount: number,
  onChange: (feedings: Feeding[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, 'feedings'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => {
      const feedings = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Feeding[];
      onChange(feedings);
    },
    (error) => {
      console.error('Firestore feedings subscription error:', error);
      onError?.(error);
    }
  );
}
