import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import type { MealSlotId } from '../types';

const SCHEDULE_DOC = doc(db, 'config', 'schedule');

const DEFAULT_ENABLED: Record<MealSlotId, boolean> = {
  morning: true,
  midday: true,
  afternoon: true,
  night: true,
};

function differs(a: Record<MealSlotId, boolean>, b: Record<MealSlotId, boolean>) {
  return (Object.keys(a) as MealSlotId[]).some((k) => a[k] !== b[k]);
}

interface MealConfigState {
  /** Último estado guardado en Firestore — lo que ve el resto de la familia. */
  enabled: Record<MealSlotId, boolean>;
  /** Estado local en edición — solo visible en este dispositivo hasta que se guarde. */
  draft: Record<MealSlotId, boolean>;
  loading: boolean;
  isDirty: boolean;
  toggle: (id: MealSlotId) => void;
  save: () => Promise<void>;
  discard: () => void;
}

export const useMealConfig = create<MealConfigState>()((set, get) => {
  let unsubFirestore: (() => void) | null = null;

  // Solo suscribirse a Firestore cuando hay usuario autenticado
  onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubFirestore = onSnapshot(SCHEDULE_DOC, (snap) => {
        const newEnabled =
          (snap.data()?.enabled as Record<MealSlotId, boolean>) ?? DEFAULT_ENABLED;
        set((s) => ({
          enabled: newEnabled,
          draft: s.isDirty ? s.draft : newEnabled,
          loading: false,
        }));
      });
    } else {
      unsubFirestore?.();
      unsubFirestore = null;
      set({ enabled: DEFAULT_ENABLED, draft: DEFAULT_ENABLED, loading: true, isDirty: false });
    }
  });

  return {
    enabled: DEFAULT_ENABLED,
    draft: DEFAULT_ENABLED,
    loading: true,
    isDirty: false,

    toggle: (id) =>
      set((s) => {
        const newDraft = { ...s.draft, [id]: !s.draft[id] };
        return { draft: newDraft, isDirty: differs(newDraft, s.enabled) };
      }),

    save: async () => {
      const { draft } = get();
      await setDoc(SCHEDULE_DOC, { enabled: draft }, { merge: true });
      set({ isDirty: false });
    },

    discard: () => {
      const { enabled } = get();
      set({ draft: { ...enabled }, isDirty: false });
    },
  };
});
