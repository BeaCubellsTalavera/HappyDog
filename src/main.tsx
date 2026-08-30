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

// Al volver al primer plano: limpiar notificaciones + forzar reconexión de Firestore.
// iOS corta la conexión WebSocket cuando la app está en background. enableNetwork()
// sola es no-op si no hubo disableNetwork() previo — hay que hacer el ciclo completo.
function onAppVisible() {
  clearHappydogNotifications();
  disableNetwork(db)
    .then(() => enableNetwork(db))
    .catch(() => {});
}

// visibilitychange: Android y Safari en pestaña de navegador.
// pageshow con persisted: iOS PWA al volver desde background (bfcache restore).
// focus: fallback adicional.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') onAppVisible();
});
window.addEventListener('pageshow', (e) => { if (e.persisted) onAppVisible(); });
window.addEventListener('focus', onAppVisible);
// También al cargar (por si la app se abrió desde la notificación)
clearHappydogNotifications();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
