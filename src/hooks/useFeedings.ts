import { create } from 'zustand';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import type { Feeding } from '../types';
import { getTodayFeedings, getTodayFeedingsFromCache } from '../lib/feedings';
import { useHistory, syncTodayInHistory } from './useHistory';
import { auth } from '../lib/firebase';

interface TodayFeedingsState {
  feedings: Feeding[];
  loading: boolean;
  reload: () => Promise<void>;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

// --- localStorage sync -------------------------------------------------------
// Serializa/deserializa Timestamp para JSON. Key incluye la fecha del día para
// que datos de ayer no contaminen la sesión de hoy.

function lsKey() { return `happydog:feedings-${today()}`; }

function serializeTs(ts: Timestamp): { _t: string; s: number; ns: number } {
  return { _t: 'ts', s: ts.seconds, ns: ts.nanoseconds };
}

function deserializeFeeding(raw: Record<string, unknown>): Feeding {
  function toTs(v: unknown): Timestamp {
    const x = v as { s: number; ns: number };
    return new Timestamp(x.s, x.ns);
  }
  return {
    ...(raw as Omit<Feeding, 'timestamp' | 'createdAt'>),
    timestamp: toTs(raw.timestamp),
    createdAt: toTs(raw.createdAt),
  };
}

function loadFromLS(): Feeding[] {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return [];
    return (JSON.parse(raw) as Record<string, unknown>[]).map(deserializeFeeding);
  } catch {
    return [];
  }
}

function saveToLS(feedings: Feeding[]) {
  try {
    const serialized = feedings.map((f) => ({
      ...f,
      timestamp: serializeTs(f.timestamp),
      createdAt: serializeTs(f.createdAt),
    }));
    localStorage.setItem(lsKey(), JSON.stringify(serialized));
  } catch {}
}
// -----------------------------------------------------------------------------

const lsCached = loadFromLS();

export const useTodayFeedings = create<TodayFeedingsState>((set, get) => ({
  feedings: lsCached,
  loading: lsCached.length === 0,
  reload: async () => {
    const isFirstLoad = get().loading;
    const todayStr = today();

    // Servir desde IndexedDB solo si localStorage estaba vacío (primera carga sin historial previo)
    if (get().loading) {
      try {
        const cached = await getTodayFeedingsFromCache(todayStr);
        if (cached.length > 0) {
          set({ feedings: cached, loading: false });
          saveToLS(cached);
          syncTodayInHistory(todayStr, cached);
        }
      } catch {
        // Sin caché disponible aún — se espera a la red
      }
    }

    // El network response es fuente de verdad — reemplaza el state completamente
    const fetched = await getTodayFeedings(todayStr);
    saveToLS(fetched);
    set({ feedings: fetched, loading: false });
    syncTodayInHistory(todayStr, fetched);
    if (isFirstLoad) {
      useHistory.getState().load();
    }
  },
}));

// Carga inmediata si ya hay sesión (auth.currentUser síncrono desde localStorage)
if (auth.currentUser) useTodayFeedings.getState().reload();
// Cubre login nuevo y confirmación del estado inicial
onAuthStateChanged(auth, (user) => {
  if (user) useTodayFeedings.getState().reload();
});

