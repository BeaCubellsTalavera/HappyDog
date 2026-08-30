import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from './lib/firebase';
import './index.css';
import App from './App.tsx';
// Registrar el listener de beforeinstallprompt cuanto antes: Chrome dispara
// el evento una sola vez y muy pronto en la carga.
import './hooks/useInstallPrompt';
import './lib/sessionMark';
// Importar el store de toast para que el listener onMessage arranque al cargar.
import './hooks/useToast';

// Cuando la app recupera el foco: cerrar notificaciones pendientes + limpiar badge.
// Así el badge desaparece al abrir la app sin tener que tocar cada notif.
async function clearHappydogNotifications() {
  if (!('serviceWorker' in navigator)) return;
  // Recorrer TODAS las registraciones: las notificaciones las muestra el SW de
  // FCM (scope /firebase-cloud-messaging-push-scope), no el SW de Workbox (/).
  // navigator.serviceWorker.ready solo devuelve el SW controlador, que es Workbox.
  const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
  await Promise.all(
    regs.map((reg) =>
      reg.getNotifications({ tag: 'happydog-feeding' })
        .then((ns) => ns.forEach((n) => n.close()))
        .catch(() => {})
    )
  );
  if ('clearAppBadge' in navigator) {
    (navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge().catch(() => {});
  }
}

// Reconexión de Firestore: iOS corta WebSocket en background y a veces en foreground
// con red inestable. El ciclo disable+enable fuerza una reconexión limpia.
// Cooldown de 10 s para no romper la conexión si focus/online disparan seguidos.
let lastReconnect = 0;
function reconnectFirestore() {
  const now = Date.now();
  if (now - lastReconnect < 10_000) return;
  lastReconnect = now;
  disableNetwork(db).then(() => enableNetwork(db)).catch(() => {});
}

function onAppVisible() {
  clearHappydogNotifications();
  reconnectFirestore();
}

// visibilitychange: Android y Safari en pestaña.
// pageshow persisted: iOS PWA vuelve desde background (bfcache restore).
// online: red vuelve tras corte (cubre foreground con red inestable).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') onAppVisible();
});
window.addEventListener('pageshow', (e) => { if (e.persisted) onAppVisible(); });
window.addEventListener('online', reconnectFirestore);
// También al cargar (por si la app se abrió desde la notificación)
clearHappydogNotifications();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
