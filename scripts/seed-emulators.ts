import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { format, set, subDays } from 'date-fns';

process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';

initializeApp({ projectId: 'demo-happydog' });

const auth = getAuth();
const db = getFirestore();

interface FeedingSpec {
  uid: string;
  name: string;
  daysBack: number;
  hour: number;
  minute: number;
}

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
  // Con el corte de día lógico a las 03:00, feedings en calendar [00:00, 03:00)
  // pertenecen al día lógico anterior. Sembramos una mezcla que cubra
  // explícitamente la madrugada (cenas tardías) y el arranque del nuevo día
  // lógico (desayunos desde las 04:00), además de algún día previo completo.
  const specs: FeedingSpec[] = [
    // Anteayer — cena normal
    { uid: 'user-ana',  name: 'Ana',  daysBack: 2, hour: 21, minute: 30 },
    // Ayer — desayuno, comida, merienda y cena
    { uid: 'user-luis', name: 'Luis', daysBack: 1, hour: 9,  minute: 15 },
    { uid: 'user-ana',  name: 'Ana',  daysBack: 1, hour: 14, minute: 0  },
    { uid: 'user-luis', name: 'Luis', daysBack: 1, hour: 19, minute: 20 },
    { uid: 'user-ana',  name: 'Ana',  daysBack: 1, hour: 22, minute: 45 },
    // Madrugada de hoy calendar (00:00-03:00) — sigue siendo día lógico "ayer"
    { uid: 'user-luis', name: 'Luis', daysBack: 0, hour: 1,  minute: 10 },
    { uid: 'user-ana',  name: 'Ana',  daysBack: 0, hour: 2,  minute: 40 },
    // Nuevo día lógico — desayunos desde las 04:00
    { uid: 'user-luis', name: 'Luis', daysBack: 0, hour: 4,  minute: 20 },
    { uid: 'user-ana',  name: 'Ana',  daysBack: 0, hour: 6,  minute: 5  },
  ];

  let seeded = 0;
  for (const s of specs) {
    const ts = set(subDays(now, s.daysBack), {
      hours: s.hour,
      minutes: s.minute,
      seconds: 0,
      milliseconds: 0,
    });
    // Evita sembrar timestamps en el futuro si seed se corre antes de esa hora.
    if (ts.getTime() > now.getTime()) continue;
    await db.collection('feedings').add({
      timestamp: Timestamp.fromDate(ts),
      dateLocal: format(ts, 'yyyy-MM-dd'),
      hourLocal: ts.getHours(),
      feederUid: s.uid,
      feederName: s.name,
      method: 'manual',
      createdAt: Timestamp.now(),
    });
    seeded += 1;
  }

  await db.collection('config').doc('nfc').set({
    token: 'dev-nfc-token-happydog',
  });

  console.log(`Seed completado: ${users.length} usuarios, ${seeded} feedings, config/nfc`);
}

seed().catch(console.error);
