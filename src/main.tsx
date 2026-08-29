import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
// Registrar el listener de beforeinstallprompt cuanto antes: Chrome dispara
// el evento una sola vez y muy pronto en la carga.
import './hooks/useInstallPrompt';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
