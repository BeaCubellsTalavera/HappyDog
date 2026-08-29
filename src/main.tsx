import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
// Registrar el listener de beforeinstallprompt cuanto antes: Chrome dispara
// el evento una sola vez y muy pronto en la carga.
import './hooks/useInstallPrompt';
// Importar el store de toast para que el listener onMessage arranque al cargar.
import './hooks/useToast';

// Cuando la app recupera el foco: cerrar notificaciones pendientes + limpiar badge.
// Así el badge del icono desaparece al abrir la app sin tener que tocar cada notif.
if ('serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.ready
      .then((reg) => reg.getNotifications({ tag: 'happydog-feeding' }))
      .then((ns) => ns.forEach((n) => n.close()))
      .catch(() => {});
    if ('clearAppBadge' in navigator) (navigator as Navigator & { clearAppBadge(): Promise<void> }).clearAppBadge().catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
