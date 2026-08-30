import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from './firebase';
import type { Feeding, NewFeeding } from '../types';

type CreateFeedingInput = {
  timestamp: Date;
  feederUid: string;
  feederName: string;
  method: 'nfc' | 'manual';
};

// persistentLocalCache escribe en IndexedDB local y resuelve rápido (<300 ms).
// Si supera este timeout es un problema de inicialización del SDK (multi-tab lock,
// IndexedDB lento) — mejor fallar claro que colgar indefinidamente.
const WRITE_TIMEOUT_MS = 4000;

export async function createFeeding(input: CreateFeedingInput): Promise<void> {
  const d = input.timestamp;
  const newDoc: NewFeeding = {
    timestamp: d,
    dateLocal: format(d, 'yyyy-MM-dd'),
    hourLocal: d.getHours(),
    feederUid: input.feederUid,
    feederName: input.feederName,
    method: input.method,
    createdAt: serverTimestamp(),
  };
  await Promise.race([
    addDoc(collection(db, 'feedings'), newDoc),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), WRITE_TIMEOUT_MS)
    ),
  ]);
}

export async function getFeeding(id: string): Promise<Feeding | null> {
  const snap = await getDoc(doc(db, 'feedings', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Feeding;
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
