import { create } from 'zustand';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format, parseISO, subDays } from 'date-fns';
import { db, auth } from '../lib/firebase';
import { logicalToday } from '../lib/logicalDay';
import type { Feeding } from '../types';

interface WeekFeedingsState {
  feedings: Feeding[];
  loading: boolean;
}

let _unsub: (() => void) | null = null;

export const useWeekFeedings = create<WeekFeedingsState>(() => {
  onAuthStateChanged(auth, (user) => {
    _unsub?.();
    _unsub = null;
    if (!user) {
      useWeekFeedings.setState({ feedings: [], loading: false });
      return;
    }
    // 6 días LÓGICOS atrás desde el día lógico actual; el rango cubre
    // hasta 8 calendar days por los feedings de madrugada, que weekGrid
    // reagrupará por logicalDate(f.timestamp).
    const since = format(subDays(parseISO(logicalToday()), 6), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'feedings'),
      where('dateLocal', '>=', since),
      orderBy('dateLocal', 'asc'),
    );
    useWeekFeedings.setState({ loading: true });
    _unsub = onSnapshot(
      q,
      (snap) => {
        const feedings = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Feeding[];
        useWeekFeedings.setState({ feedings, loading: false });
      },
      () => useWeekFeedings.setState({ loading: false }),
    );
  });

  return { feedings: [], loading: true };
});
