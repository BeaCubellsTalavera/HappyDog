import { create } from 'zustand';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import {
  DEFAULT_MEALS,
  DEFAULT_MEAL_COUNT,
  MEAL_IDS,
  computeDefaultSlots,
  type MealsMap,
  type MealFields,
  type MealCount,
} from '../lib/mealSlots';
import type { MealSlotId } from '../types';

const SCHEDULE_DOC = doc(db, 'config', 'schedule');

function mealsDiffer(a: MealsMap, b: MealsMap): boolean {
  return MEAL_IDS.some(
    (k) =>
      a[k].name !== b[k].name ||
      a[k].startHour !== b[k].startHour ||
      a[k].endHour !== b[k].endHour,
  );
}

function computeIsDirty(state: {
  draftMealCount: MealCount;
  mealCount: MealCount;
  draftMeals: MealsMap;
  meals: MealsMap;
}): boolean {
  return state.draftMealCount !== state.mealCount || mealsDiffer(state.draftMeals, state.meals);
}

function cloneMeals(m: MealsMap): MealsMap {
  return {
    morning:   { ...m.morning },
    midday:    { ...m.midday },
    afternoon: { ...m.afternoon },
    night:     { ...m.night },
  };
}

function normalizeEndHour(h: number): number {
  return h === 24 ? 0 : h;
}

function parseMeals(raw: unknown): MealsMap {
  const src =
    raw && typeof raw === 'object'
      ? (raw as Partial<Record<MealSlotId, Partial<MealFields>>>)
      : {};
  const out = {} as MealsMap;
  for (const id of MEAL_IDS) {
    const patch = src[id];
    const base = DEFAULT_MEALS[id];
    const rawEnd = Number.isFinite(patch?.endHour)
      ? (patch!.endHour as number)
      : base.endHour;
    out[id] = {
      name: typeof patch?.name === 'string' && patch.name.length > 0 ? patch.name : base.name,
      startHour: Number.isFinite(patch?.startHour) ? (patch!.startHour as number) : base.startHour,
      endHour: normalizeEndHour(rawEnd),
    };
  }
  return out;
}

function parseMealCount(raw: unknown): MealCount {
  if (typeof raw === 'number' && raw >= 1 && raw <= 4) return raw as MealCount;
  return DEFAULT_MEAL_COUNT;
}

interface MealConfigState {
  mealCount: MealCount;
  draftMealCount: MealCount;
  meals: MealsMap;
  draftMeals: MealsMap;
  loading: boolean;
  isDirty: boolean;

  updateMeal: (id: MealSlotId, patch: Partial<MealFields>) => void;
  save: () => Promise<void>;
  discard: () => void;
  applyEqualDistribution: (count: MealCount) => void;
}

export const useMealConfig = create<MealConfigState>()((set, get) => {
  let unsubFirestore: (() => void) | null = null;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubFirestore = onSnapshot(SCHEDULE_DOC, (snap) => {
        const data = snap.data();
        const newMealCount = parseMealCount(data?.mealCount);
        const newMeals = parseMeals(data?.meals);
        set((s) => ({
          mealCount: newMealCount,
          meals: newMeals,
          draftMealCount: s.isDirty ? s.draftMealCount : newMealCount,
          draftMeals: s.isDirty ? s.draftMeals : cloneMeals(newMeals),
          loading: false,
        }));
      });
    } else {
      unsubFirestore?.();
      unsubFirestore = null;
      set({
        mealCount: DEFAULT_MEAL_COUNT,
        meals: cloneMeals(DEFAULT_MEALS),
        draftMeals: cloneMeals(DEFAULT_MEALS),
        loading: true,
        isDirty: false,
      });
    }
  });

  function recomputeDirty(nextMeals: MealsMap): boolean {
    const { meals, mealCount, draftMealCount } = get();
    return draftMealCount !== mealCount || mealsDiffer(nextMeals, meals);
  }

  return {
    mealCount: DEFAULT_MEAL_COUNT,
    draftMealCount: DEFAULT_MEAL_COUNT,
    meals: cloneMeals(DEFAULT_MEALS),
    draftMeals: cloneMeals(DEFAULT_MEALS),
    loading: true,
    isDirty: false,

    updateMeal: (id, patch) =>
      set((s) => {
        const nextMeals = { ...s.draftMeals, [id]: { ...s.draftMeals[id], ...patch } };
        return { draftMeals: nextMeals, isDirty: recomputeDirty(nextMeals) };
      }),

    save: async () => {
      const { draftMealCount, draftMeals } = get();
      const activeMeals = Object.fromEntries(
        MEAL_IDS.slice(0, draftMealCount).map((id) => [id, draftMeals[id]]),
      );
      await setDoc(SCHEDULE_DOC, { mealCount: draftMealCount, meals: activeMeals });
      set({
        mealCount: draftMealCount,
        meals: cloneMeals(draftMeals),
        isDirty: false,
      });
    },

    discard: () => {
      const { mealCount, meals } = get();
      set({ draftMealCount: mealCount, draftMeals: cloneMeals(meals), isDirty: false });
    },

    applyEqualDistribution: (count) => {
      const newMeals = computeDefaultSlots(count);
      const { mealCount, meals } = get();
      set({
        draftMealCount: count,
        draftMeals: cloneMeals(newMeals),
        isDirty: computeIsDirty({ draftMealCount: count, mealCount, draftMeals: newMeals, meals }),
      });
    },
  };
});
