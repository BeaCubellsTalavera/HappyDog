import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useFcmToken } from './hooks/useFcmToken';
import { useTodayFeedings } from './hooks/useFeedings';
import './index.css';
import App from './App.tsx';
// Registrar el listener de beforeinstallprompt cuanto antes: Chrome dispara
// el evento una sola vez y muy pronto en la carga.
import './hooks/useInstallPrompt';
import './lib/sessionMark';
// Importar el store de toast para que el listener onMessage arranque al cargar.
import './hooks/useToast';

async function clearHappydogNotifications() {
  if (!('serviceWorker' in navigator)) return;
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
  navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_BADGE' });
}

// Refresco de token FCM: si la Cloud Function borró el token por error transitorio,
// el próximo onAppVisible lo recupera sin esperar a que el usuario vuelva a hacer login.
// Cooldown de 5 min para no spamear Firestore.
let lastTokenRefresh = 0;
function maybeRefreshFcmToken() {
  const now = Date.now();
  if (now - lastTokenRefresh < 5 * 60_000) return;
  lastTokenRefresh = now;
  const { permission, enabled, loading, enableNotifications } = useFcmToken.getState();
  if (permission === 'granted' && enabled && !loading) {
    enableNotifications();
  }
}

function onAppVisible() {
  clearHappydogNotifications();
  useTodayFeedings.getState().reload();
  maybeRefreshFcmToken();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') onAppVisible();
});
window.addEventListener('pageshow', (e) => { if (e.persisted) onAppVisible(); });
window.addEventListener('online', () => useTodayFeedings.getState().reload());
clearHappydogNotifications();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
