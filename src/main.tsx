import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableNetwork } from 'firebase/firestore';
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

// Al volver al primer plano: limpiar notificaciones + forzar reconexión de Firestore.
// iOS Safari corta las conexiones WebSocket cuando la app está en background; sin
// enableNetwork() el listener onSnapshot queda parado hasta que algo lo reactiva.
function onAppVisible() {
  clearHappydogNotifications();
  enableNetwork(db).catch(() => {});
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') onAppVisible();
});
window.addEventListener('focus', onAppVisible);
// También al cargar (por si la app se abrió desde la notificación)
clearHappydogNotifications();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
