import { useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useFeedings } from '../hooks/useFeedings';
import { signOutUser } from '../lib/auth';
import { FeedingCard } from '../components/FeedingCard';
import {
  ManualFeedDialog,
  type ManualFeedDialogHandle,
} from '../components/ManualFeedDialog';

export default function Home() {
  const { user } = useAuth();
  const { feedings, loading } = useFeedings();
  const dialogRef = useRef<ManualFeedDialogHandle>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFeedings = useMemo(
    () => feedings.filter((f) => f.dateLocal === today),
    [feedings, today]
  );

  const initials = (user?.displayName ?? user?.email ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-orange-500">HappyDog</h1>
        <div className="flex items-center gap-3">
          <Link to="/history" className="text-sm text-gray-500 hover:text-gray-700">
            Historial
          </Link>
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-xs">
            {initials}
          </div>
          <button
            onClick={signOutUser}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-4 max-w-md mx-auto w-full">
        <button
          onClick={() => dialogRef.current?.open()}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-2xl shadow-sm transition-colors"
        >
          Dar de comer ahora
        </button>

        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-3">Comidas de hoy</h2>
          {loading ? (
            <p className="text-center text-gray-400 py-8">Cargando…</p>
          ) : todayFeedings.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Todavía no han comido hoy</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todayFeedings.map((f) => (
                <FeedingCard key={f.id} feeding={f} />
              ))}
            </div>
          )}
        </section>
      </main>

      <ManualFeedDialog ref={dialogRef} />
    </div>
  );
}
