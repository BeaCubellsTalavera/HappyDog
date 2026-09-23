import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { DEFAULT_MEALS, MEAL_IDS, type MealsMap, type MealFields } from '../lib/mealSlots';
import type { MealSlotId } from '../types';

const SCHEDULE_DOC = doc(db, 'config', 'schedule');

const DEFAULT_ENABLED: Record<MealSlotId, boolean> = {
  morning: true,
  midday: true,
  afternoon: true,
  night: true,
};

type EnabledMap = Record<MealSlotId, boolean>;

function enabledDiffers(a: EnabledMap, b: EnabledMap): boolean {
  return MEAL_IDS.some((k) => a[k] !== b[k]);
}

function mealsDiffer(a: MealsMap, b: MealsMap): boolean {
  return MEAL_IDS.some(
    (k) =>
      a[k].name !== b[k].name ||
      a[k].startHour !== b[k].startHour ||
      a[k].endHour !== b[k].endHour,
  );
}

function cloneMeals(m: MealsMap): MealsMap {
  return {
    morning:   { ...m.morning },
    midday:    { ...m.midday },
    afternoon: { ...m.afternoon },
    night:     { ...m.night },
  };
}

/** Parsea el `meals` del snapshot rellenando con defaults los slots ausentes. */
function parseMeals(raw: unknown): MealsMap {
  if (!raw || typeof raw !== 'object') return cloneMeals(DEFAULT_MEALS);
  const src = raw as Partial<Record<MealSlotId, Partial<MealFields>>>;
  const out = {} as MealsMap;
  for (const id of MEAL_IDS) {
    const patch = src[id];
    const base = DEFAULT_MEALS[id];
    out[id] = {
      name: typeof patch?.name === 'string' && patch.name.length > 0 ? patch.name : base.name,
      startHour: Number.isFinite(patch?.startHour) ? (patch!.startHour as number) : base.startHour,
      endHour: Number.isFinite(patch?.endHour) ? (patch!.endHour as number) : base.endHour,
    };
  }
  return out;
}

interface MealConfigState {
  /** Última versión guardada en Firestore. */
  enabled: EnabledMap;
  meals: MealsMap;
  /** Draft local — sólo visible en este dispositivo hasta que se guarde. */
  draftEnabled: EnabledMap;
  draftMeals: MealsMap;
  loading: boolean;
  isDirty: boolean;

  toggleEnabled: (id: MealSlotId) => void;
  updateMeal: (id: MealSlotId, patch: Partial<MealFields>) => void;
  save: () => Promise<void>;
  discard: () => void;
}

export const useMealConfig = create<MealConfigState>()((set, get) => {
  let unsubFirestore: (() => void) | null = null;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubFirestore = onSnapshot(SCHEDULE_DOC, (snap) => {
        const data = snap.data();
        const newEnabled = (data?.enabled as EnabledMap) ?? DEFAULT_ENABLED;
        const newMeals = parseMeals(data?.meals);
        set((s) => ({
          enabled: newEnabled,
          meals: newMeals,
          draftEnabled: s.isDirty ? s.draftEnabled : newEnabled,
          draftMeals: s.isDirty ? s.draftMeals : cloneMeals(newMeals),
          loading: false,
        }));
      });
    } else {
      unsubFirestore?.();
      unsubFirestore = null;
      set({
        enabled: DEFAULT_ENABLED,
        meals: cloneMeals(DEFAULT_MEALS),
        draftEnabled: DEFAULT_ENABLED,
        draftMeals: cloneMeals(DEFAULT_MEALS),
        loading: true,
        isDirty: false,
      });
    }
  });

  function recomputeDirty(nextEnabled: EnabledMap, nextMeals: MealsMap): boolean {
    const { enabled, meals } = get();
    return enabledDiffers(nextEnabled, enabled) || mealsDiffer(nextMeals, meals);
  }

  return {
    enabled: DEFAULT_ENABLED,
    meals: cloneMeals(DEFAULT_MEALS),
    draftEnabled: DEFAULT_ENABLED,
    draftMeals: cloneMeals(DEFAULT_MEALS),
    loading: true,
    isDirty: false,

    toggleEnabled: (id) =>
      set((s) => {
        const nextEnabled = { ...s.draftEnabled, [id]: !s.draftEnabled[id] };
        return { draftEnabled: nextEnabled, isDirty: recomputeDirty(nextEnabled, s.draftMeals) };
      }),

    updateMeal: (id, patch) =>
      set((s) => {
        const nextMeals = { ...s.draftMeals, [id]: { ...s.draftMeals[id], ...patch } };
        return { draftMeals: nextMeals, isDirty: recomputeDirty(s.draftEnabled, nextMeals) };
      }),

    save: async () => {
      const { draftEnabled, draftMeals } = get();
      await setDoc(
        SCHEDULE_DOC,
        { enabled: draftEnabled, meals: draftMeals },
        { merge: true },
      );
      set({
        enabled: draftEnabled,
        meals: cloneMeals(draftMeals),
        isDirty: false,
      });
    },

    discard: () => {
      const { enabled, meals } = get();
      set({ draftEnabled: { ...enabled }, draftMeals: cloneMeals(meals), isDirty: false });
    },
  };
});
