import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { format, subHours } from 'date-fns';

process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';

initializeApp({ projectId: 'demo-happydog' });

const auth = getAuth();
const db = getFirestore();

async function seed() {
  const users = [
    { uid: 'user-ana', email: 'ana@example.com', displayName: 'Ana' },
    { uid: 'user-luis', email: 'luis@example.com', displayName: 'Luis' },
  ];

  for (const u of users) {
    try {
      await auth.createUser(u);
    } catch {
      // ya existe
    }
    await db.collection('users').doc(u.uid).set({
      displayName: u.displayName,
      email: u.email,
      photoURL: null,
      fcmTokens: [],
      createdAt: Timestamp.now(),
    });
  }

  const now = new Date();
  const feedings = [
    { uid: 'user-ana', name: 'Ana', hoursAgo: 1 },
    { uid: 'user-luis', name: 'Luis', hoursAgo: 3 },
    { uid: 'user-ana', name: 'Ana', hoursAgo: 8 },
    { uid: 'user-luis', name: 'Luis', hoursAgo: 14 },
    { uid: 'user-ana', name: 'Ana', hoursAgo: 26 },
  ];

  for (const f of feedings) {
    const ts = subHours(now, f.hoursAgo);
    await db.collection('feedings').add({
      timestamp: Timestamp.fromDate(ts),
      dateLocal: format(ts, 'yyyy-MM-dd'),
      hourLocal: ts.getHours(),
      feederUid: f.uid,
      feederName: f.name,
      method: 'manual',
      createdAt: Timestamp.now(),
    });
  }

  await db.collection('config').doc('nfc').set({
    token: 'dev-nfc-token-happydog',
  });

  console.log('Seed completado: 2 usuarios, 5 feedings, config/nfc');
}

seed().catch(console.error);
