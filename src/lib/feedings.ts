import {
  addDoc,
  collection,
  getDocs,
  getDocsFromCache,
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
import { format } from 'date-fns';
import { db } from './firebase';
import type { Feeding, NewFeeding } from '../types';

type CreateFeedingInput = {
  timestamp: Date;
  feederUid: string;
  feederName: string;
  method: 'nfc' | 'manual';
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
  };
}

export async function getTodayFeedingsFromCache(today: string): Promise<Feeding[]> {
  const q = query(collection(db, 'feedings'), where('dateLocal', '==', today));
  const snap = await getDocsFromCache(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Feeding[])
    .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

export async function getTodayFeedings(today: string): Promise<Feeding[]> {
  const q = query(collection(db, 'feedings'), where('dateLocal', '==', today));
  const snap = await getDocs(q);
  const feedings = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Feeding[];
  return feedings.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
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
