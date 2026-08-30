import { create } from 'zustand';
import { parseISO, isToday, isYesterday, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { Feeding } from '../types';
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
  load: () => Promise<void>;
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

// Llamado desde useTodayFeedings cada vez que los feedings de hoy cambian,
// para mantener la sección "Hoy" de Historia sincronizada sin recargar todo.
export function syncTodayInHistory(todayDate: string, feedings: Feeding[]) {
  const { days } = useHistory.getState();
  if (days.length === 0) return; // Historia aún no cargada; se incluirá al cargar
  const otherDays = days.filter((d) => d.date !== todayDate);
  if (feedings.length === 0) {
    useHistory.setState({ days: otherDays });
    return;
  }
  const sorted = [...feedings].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
  const todayGroup: DayGroup = { date: todayDate, label: 'Hoy', feedings: sorted };
  useHistory.setState({ days: [todayGroup, ...otherDays] });
}

export function injectHistoryFeeding(feeding: Feeding) {
  const { days } = useHistory.getState();
  if (days.length === 0) {
    useHistory.getState().load();
    return;
  }
  const dateStr = feeding.dateLocal;
  const existing = days.find((d) => d.date === dateStr);
  if (existing) {
    const updatedFeedings = [...existing.feedings, feeding].sort(
      (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
    );
    useHistory.setState({
      days: days.map((d) => (d.date === dateStr ? { ...d, feedings: updatedFeedings } : d)),
    });
  } else {
    const newDay: DayGroup = { date: dateStr, label: dayLabel(dateStr), feedings: [feeding] };
    const sorted = [...days, newDay].sort((a, b) => b.date.localeCompare(a.date));
    useHistory.setState({ days: sorted });
  }
}

export const useHistory = create<HistoryState>((set, get) => ({
  days: [],
  loading: false,
  hasMore: false,
  cursor: null,

  load: async () => {
    if (get().days.length > 0) return;
    set({ loading: true });
    try {
      const { feedings, lastDoc } = await getHistoryPage(null);
      set({ days: groupByDay(feedings), cursor: lastDoc, hasMore: lastDoc !== null, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { cursor, days, loading } = get();
    if (!cursor || loading) return;
    set({ loading: true });
    try {
      const { feedings, lastDoc } = await getHistoryPage(cursor);
      const allFeedings = days.flatMap((d) => d.feedings).concat(feedings);
      set({ days: groupByDay(allFeedings), cursor: lastDoc, hasMore: lastDoc !== null, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
