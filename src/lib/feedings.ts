import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  limit as firestoreLimit,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { addDays, format, parseISO } from 'date-fns';
import { db } from './firebase';
import { logicalDate } from './logicalDay';
import type { Feeding, NewFeeding } from '../types';

type CreateFeedingInput = {
  timestamp: Date;
  feederUid: string;
  feederName: string;
  method: 'nfc' | 'manual' | 'skipped';
  outOfSlot?: boolean;
};

const WRITE_TIMEOUT_MS = 4000;

export async function createFeeding(input: CreateFeedingInput): Promise<Feeding> {
  const d = input.timestamp;
  const newDoc: NewFeeding = {
    timestamp: d,
    dateLocal: format(d, 'yyyy-MM-dd'),
    hourLocal: d.getHours(),
    feederUid: input.feederUid,
    feederName: input.feederName,
    method: input.method,
    createdAt: serverTimestamp(),
    ...(input.outOfSlot ? { outOfSlot: true } : {}),
  };
  const docRef = await Promise.race([
    addDoc(collection(db, 'feedings'), newDoc),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), WRITE_TIMEOUT_MS)
    ),
  ]);
  return {
    id: docRef.id,
    timestamp: Timestamp.fromDate(d),
    dateLocal: format(d, 'yyyy-MM-dd'),
    hourLocal: d.getHours(),
    feederUid: input.feederUid,
    feederName: input.feederName,
    method: input.method,
    createdAt: Timestamp.now(),
    ...(input.outOfSlot ? { outOfSlot: true } : {}),
  };
}

/**
 * Devuelve los feedings del DÍA LÓGICO indicado. Consulta ambos calendar days
 * que pueden contener feedings de ese logical day (el propio y el siguiente,
 * este último cubriendo la madrugada 00:00–03:59) y filtra en cliente por
 * `logicalDate(f.timestamp)` para descartar el resto.
 */
export async function getTodayFeedings(logicalToday: string): Promise<Feeding[]> {
  const nextCalendarDay = format(addDays(parseISO(logicalToday), 1), 'yyyy-MM-dd');
  const q = query(
    collection(db, 'feedings'),
    where('dateLocal', 'in', [logicalToday, nextCalendarDay]),
  );
  const snap = await getDocs(q);
  const feedings = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Feeding[];
  return feedings
    .filter((f) => logicalDate(f.timestamp.toDate()) === logicalToday)
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

export async function getStatsFeedings(max = 300): Promise<Feeding[]> {
  const q = query(
    collection(db, 'feedings'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Feeding[];
}

export async function getHistoryPage(
  cursor: DocumentSnapshot | null,
  pageSize = 60
): Promise<{ feedings: Feeding[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [
    orderBy('timestamp', 'desc'),
    firestoreLimit(pageSize),
  ];
  if (cursor) constraints.push(startAfter(cursor));
  const q = query(collection(db, 'feedings'), ...constraints);
  const snap = await getDocs(q);
  const feedings = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Feeding[];
  const lastDoc = snap.docs.length < pageSize ? null : (snap.docs[snap.docs.length - 1] ?? null);
  return { feedings, lastDoc };
}
