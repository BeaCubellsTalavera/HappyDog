import { useRef, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useFeedings } from '../hooks/useFeedings';
import { createFeeding } from '../lib/feedings';
import { FeedingCard } from '../components/FeedingCard';
import { Layout } from '../components/Layout';
import {
  ManualFeedDialog,
  type ManualFeedDialogHandle,
} from '../components/ManualFeedDialog';

type FeedState = 'idle' | 'saving' | 'done';

export default function Home() {
  const { user } = useAuth();
  const { feedings, loading } = useFeedings();
  const dialogRef = useRef<ManualFeedDialogHandle>(null);
  const [feedState, setFeedState] = useState<FeedState>('idle');

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFeedings = useMemo(
    () => feedings.filter((f) => f.dateLocal === today),
    [feedings, today]
  );

  async function handleFeedNow() {
    if (feedState !== 'idle' || !user) return;
    setFeedState('saving');
    try {
      await createFeeding({
        timestamp: new Date(),
        feederUid: user.uid,
        feederName: user.displayName ?? user.email ?? 'Desconocido',
        method: 'manual',
      });
      setFeedState('done');
      setTimeout(() => setFeedState('idle'), 2000);
    } catch {
      setFeedState('idle');
    }
  }

  return (
    <Layout>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Botones fijos — no hacen scroll */}
        <div className="pt-6 pb-4 flex flex-col gap-3 shrink-0">
          <button
            onClick={handleFeedNow}
            disabled={feedState !== 'idle'}
            className={`w-full py-4 text-white font-semibold rounded-2xl shadow-sm transition-all ${
              feedState === 'done'
                ? 'bg-green-500'
                : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-75'
            }`}
          >
            {feedState === 'saving' && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle" />
            )}
            {feedState === 'done' ? '✓ Anotado' : 'Dar de comer ahora'}
          </button>

          <button
            onClick={() => dialogRef.current?.open()}
            className="w-full py-3 border border-orange-200 text-orange-500 text-sm font-medium rounded-2xl bg-white hover:bg-orange-50 active:bg-orange-100 transition-colors"
          >
            Anotar comida olvidada
          </button>
        </div>

        {/* Lista — solo esta parte hace scroll */}
        <section className="flex-1 overflow-y-auto min-h-0 pb-4">
          <h2 className="sticky top-0 bg-gray-50 text-sm font-medium text-gray-500 py-2 mb-1 z-10">
            Comidas de hoy
          </h2>
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
      </div>

      <ManualFeedDialog ref={dialogRef} />
    </Layout>
  );
}
