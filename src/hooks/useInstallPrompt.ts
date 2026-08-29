import { create } from 'zustand';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface State {
  deferred: BeforeInstallPromptEvent | null;
  setDeferred: (e: BeforeInstallPromptEvent | null) => void;
}

export const useInstallPrompt = create<State>((set) => ({
  deferred: null,
  setDeferred: (e) => set({ deferred: e }),
}));

// El listener se registra al importar el módulo, antes de que React monte nada.
// Chrome dispara `beforeinstallprompt` una sola vez y muy pronto; si esperamos al
// mount de un componente, se pierde y el banner no aparece nunca.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstallPrompt.getState().setDeferred(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    useInstallPrompt.getState().setDeferred(null);
  });
}
