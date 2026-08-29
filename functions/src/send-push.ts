import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

if (getApps().length === 0) initializeApp();

interface FeedingDoc {
  feederUid: string;
  feederName: string;
  method: 'nfc' | 'manual';
}

interface UserTokens {
  uid: string;
  tokens: string[];
}

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export const sendPushOnFeeding = onDocumentCreated(
  {
    document: 'feedings/{id}',
    region: 'europe-southwest1',
    memory: '256MiB',
    retry: false,
  },
  async (event) => {
    const feeding = event.data?.data() as FeedingDoc | undefined;
    if (!feeding) {
      logger.warn('Feeding sin data, salto', { id: event.params.id });
      return;
    }

    const db = getFirestore();
    const usersSnap = await db.collection('users').get();

    const targets: UserTokens[] = [];
    for (const doc of usersSnap.docs) {
      if (doc.id === feeding.feederUid) continue;
      const tokens = (doc.get('fcmTokens') as string[] | undefined) ?? [];
      if (tokens.length > 0) targets.push({ uid: doc.id, tokens });
    }

    if (targets.length === 0) {
      logger.info('Sin destinatarios con fcmTokens', { feedingId: event.params.id });
      return;
    }

    const flatTokens: string[] = [];
    const tokenOwner: string[] = [];
    for (const t of targets) {
      for (const tok of t.tokens) {
        flatTokens.push(tok);
        tokenOwner.push(t.uid);
      }
    }

    const methodLabel = feeding.method === 'nfc' ? '(NFC)' : '(manual)';

    // webpush.notification: el navegador muestra la notificación directamente
    // (single codepath, sin duplicados). onBackgroundMessage sigue disparando
    // pero ya no necesita llamar a showNotification — solo pone el badge.
    // data: campos extra para el notificationclick handler en el SW.
    const response = await getMessaging().sendEachForMulticast({
      tokens: flatTokens,
      webpush: {
        notification: {
          title: '🐾 Han dado de comer',
          body: `${feeding.feederName} acaba de darles de comer ${methodLabel}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'happydog-feeding',
          renotify: true,
        },
      },
      data: {
        feedingId: event.params.id,
        feederUid: feeding.feederUid,
        method: feeding.method,
      },
    });

    logger.info('Push enviado', {
      feedingId: event.params.id,
      success: response.successCount,
      failure: response.failureCount,
      total: flatTokens.length,
    });

    const deadByUid = new Map<string, string[]>();
    response.responses.forEach((r, i) => {
      if (r.success) return;
      const code = r.error?.code ?? '';
      if (!DEAD_TOKEN_CODES.has(code)) {
        logger.warn('Fallo transitorio, no limpio token', { code, uid: tokenOwner[i] });
        return;
      }
      const uid = tokenOwner[i];
      const dead = deadByUid.get(uid) ?? [];
      dead.push(flatTokens[i]);
      deadByUid.set(uid, dead);
    });

    if (deadByUid.size === 0) return;

    await Promise.all(
      Array.from(deadByUid.entries()).map(([uid, dead]) =>
        db.doc(`users/${uid}`).update({
          fcmTokens: FieldValue.arrayRemove(...dead),
        })
      )
    );
    logger.info('Tokens muertos purgados', { users: deadByUid.size });
  }
);
