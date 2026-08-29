import { useEffect, useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const DISMISS_KEY = 'happydog:install-dismissed-at';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS expone navigator.standalone (no está en TS lib.dom por defecto).
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function isRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISS_MS;
}

export function InstallPrompt() {
  const deferred = useInstallPrompt((s) => s.deferred);
  const setDeferred = useInstallPrompt((s) => s.setDeferred);
  const [iosVisible, setIosVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => isRecentlyDismissed());

  useEffect(() => {
    if (isStandalone()) return;
    if (isIos()) setIosVisible(true);
  }, []);

  if (dismissed) return null;
  if (isStandalone()) return null;
  if (!deferred && !iosVisible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'dismissed') dismiss();
  }

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold">Instala HappyDog en tu móvil</p>
          {deferred ? (
            <p className="text-orange-800/80 mt-1">
              Tenla siempre a mano para registrar cuándo comen.
            </p>
          ) : (
            <p className="text-orange-800/80 mt-1">
              Toca <span aria-label="botón compartir">⬆︎</span> Compartir y luego
              <strong> Añadir a pantalla de inicio</strong>.
            </p>
          )}
          {deferred && (
            <button
              onClick={install}
              className="mt-2 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 active:bg-orange-700"
            >
              Instalar
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Ocultar"
          className="text-orange-500 hover:text-orange-700 leading-none text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
