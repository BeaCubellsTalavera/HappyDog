import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from './firebase';

let lastReconnect = 0;

export function reconnectFirestore(cooldownMs = 10_000) {
  const now = Date.now();
  if (now - lastReconnect < cooldownMs) return;
  lastReconnect = now;
  disableNetwork(db).then(() => enableNetwork(db)).catch(() => {});
}
