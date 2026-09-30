import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { format, subDays } from 'date-fns';

process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';

if (getApps().length === 0) initializeApp({ projectId: 'demo-happydog' });
const db = getFirestore();

type SlotSpec = {
  id: 'morning' | 'midday' | 'afternoon' | 'night';
  mu: number;
  sigma: number;
  min: number;
  max: number;
  probability: number;
};

const SLOTS: SlotSpec[] = [
  { id: 'morning',   mu: 9.5,  sigma: 0.8, min: 8,  max: 13, probability: 0.9 },
  { id: 'midday',    mu: 14.5, sigma: 0.7, min: 13, max: 18, probability: 0.85 },
  { id: 'afternoon', mu: 19,   sigma: 0.5, min: 18, max: 20, probability: 0.75 },
  { id: 'night',     mu: 22,   sigma: 0.8, min: 20, max: 24, probability: 0.9 },
];

const USERS = [
  { uid: 'user-ana',  name: 'Ana'  },
  { uid: 'user-luis', name: 'Luis' },
];

const DAYS = 100;
const NFC_RATIO = 0.15;

function gaussian(mu: number, sigma: number): number {
  const u1 = 1 - Math.random();
  const u2 = 1 - Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + z * sigma;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.min(max - 0.001, 23.999));
}

async function clearFeedings() {
  const snap = await db.collection('feedings').get();
  const batches: FirebaseFirestore.WriteBatch[] = [];
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count += 1;
    if (count === 400) {
      batches.push(batch);
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) batches.push(batch);
  for (const b of batches) await b.commit();
  console.log(`Borrados ${snap.size} feedings previos.`);
}

async function seed() {
  await clearFeedings();

  const today = new Date();
  let created = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (let d = 0; d < DAYS; d += 1) {
    const base = subDays(today, d);
    for (const slot of SLOTS) {
      if (Math.random() > slot.probability) continue;

      const hourContinuous = clamp(
        gaussian(slot.mu, slot.sigma),
        slot.min,
        slot.max,
      );
      const hh = Math.floor(hourContinuous);
      const mm = Math.floor((hourContinuous - hh) * 60);
      const ts = new Date(base);
      ts.setHours(hh, mm, Math.floor(Math.random() * 60), 0);

      const user = USERS[Math.floor(Math.random() * USERS.length)];
      const method = Math.random() < NFC_RATIO ? 'nfc' : 'manual';

      const ref = db.collection('feedings').doc();
      batch.set(ref, {
        timestamp: Timestamp.fromDate(ts),
        dateLocal: format(ts, 'yyyy-MM-dd'),
        hourLocal: ts.getHours(),
        feederUid: user.uid,
        feederName: user.name,
        method,
        createdAt: Timestamp.now(),
      });
      created += 1;
      batchCount += 1;
      if (batchCount === 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }
  if (batchCount > 0) await batch.commit();

  console.log(`Seed stats completado: ${created} feedings a lo largo de ${DAYS} dias.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
