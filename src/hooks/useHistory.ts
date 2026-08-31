import { create } from 'zustand';
import { parseISO, isToday, isYesterday, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { collection, limit, onSnapshot, orderBy, query, type DocumentSnapshot } from 'firebase/firestore';
import type { Feeding } from '../types';
import { db } from '../lib/firebase';
import { getHistoryPage } from '../lib/feedings';

export interface DayGroup {
  date: string;
  label: string;
  feedings: Feeding[];
}

interface HistoryState {
  days: DayGroup[];
  loading: boolean;
  hasMore: boolean;
  cursor: DocumentSnapshot | null;
  load: () => void;
  loadMore: () => Promise<void>;
}

function dayLabel(dateLocal: string): string {
  const d = parseISO(dateLocal);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "EEEE, d 'de' MMMM", { locale: es });
}

function groupByDay(feedings: Feeding[]): DayGroup[] {
  const byDay: Record<string, Feeding[]> = {};
  for (const f of feedings) {
    (byDay[f.dateLocal] ??= []).push(f);
  }
  return Object.keys(byDay)
    .sort()
    .reverse()
    .map((date) => ({ date, label: dayLabel(date), feedings: byDay[date] }));
}

const PAGE_SIZE = 60;

// Módulo: estado de la suscripción y las páginas adicionales
let _unsub: (() => void) | null = null;
let _snapshotDays: DayGroup[] = [];   // primera "página" viva vía onSnapshot
let _extraFeedings: Feeding[] = [];   // páginas extra cargadas con loadMore

function rebuildDays(): DayGroup[] {
  const snapshotDates = new Set(_snapshotDays.map((d) => d.date));
  const filteredExtra = _extraFeedings.filter((f) => !snapshotDates.has(f.dateLocal));
  return [..._snapshotDays, ...groupByDay(filteredExtra)];
}

// Llamado desde useTodayFeedings cada vez que los feedings de hoy cambian,
// para mantener la sección "Hoy" de Historia sincronizada sin recargar todo.
export function syncTodayInHistory(todayDate: string, feedings: Feeding[]) {
  if (_snapshotDays.length === 0 && useHistory.getState().days.length === 0) return;
  const otherDays = _snapshotDays.filter((d) => d.date !== todayDate);
  if (feedings.length === 0) {
    _snapshotDays = otherDays;
  } else {
    const sorted = [...feedings].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    _snapshotDays = [{ date: todayDate, label: 'Hoy', feedings: sorted }, ...otherDays];
  }
  useHistory.setState({ days: rebuildDays() });
}

export function injectHistoryFeeding(feeding: Feeding) {
  if (_snapshotDays.length === 0 && useHistory.getState().days.length === 0) {
    useHistory.getState().load();
    return;
  }
  const dateStr = feeding.dateLocal;
  const snapshotDay = _snapshotDays.find((d) => d.date === dateStr);
  if (snapshotDay) {
    const updated = [...snapshotDay.feedings, feeding].sort(
      (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
    );
    _snapshotDays = _snapshotDays.map((d) => (d.date === dateStr ? { ...d, feedings: updated } : d));
  } else if (_extraFeedings.some((f) => f.dateLocal === dateStr)) {
    _extraFeedings = [..._extraFeedings, feeding];
  } else {
    // Fecha no vista aún — añadir al snapshot (onSnapshot corregirá si hace falta)
    const newDay: DayGroup = { date: dateStr, label: dayLabel(dateStr), feedings: [feeding] };
    _snapshotDays = [newDay, ..._snapshotDays].sort((a, b) => b.date.localeCompare(a.date));
  }
  useHistory.setState({ days: rebuildDays() });
}

export const useHistory = create<HistoryState>((set, get) => ({
  days: [],
  loading: false,
  hasMore: false,
  cursor: null,

  load: () => {
    if (_unsub) return; // Ya suscrito
    set({ loading: true });
    const q = query(collection(db, 'feedings'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE));
    _unsub = onSnapshot(
      q,
      (snap) => {
        const snapshotFeedings = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Feeding[];
        const lastDoc = snap.docs.length < PAGE_SIZE ? null : (snap.docs[snap.docs.length - 1] ?? null);
        _snapshotDays = groupByDay(snapshotFeedings);
        // Eliminar de extra los días que ya cubre el snapshot
        const snapshotDates = new Set(_snapshotDays.map((d) => d.date));
        _extraFeedings = _extraFeedings.filter((f) => !snapshotDates.has(f.dateLocal));
        set({ days: rebuildDays(), cursor: lastDoc, hasMore: lastDoc !== null, loading: false });
      },
      () => set({ loading: false }),
    );
  },

  loadMore: async () => {
    const { cursor, loading } = get();
    if (!cursor || loading) return;
    set({ loading: true });
    try {
      const { feedings, lastDoc } = await getHistoryPage(cursor);
      _extraFeedings = [..._extraFeedings, ...feedings];
      set({ days: rebuildDays(), cursor: lastDoc, hasMore: lastDoc !== null, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
