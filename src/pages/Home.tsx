import { useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { useFeedings } from '../hooks/useFeedings';
import { FeedingCard } from '../components/FeedingCard';
import { Layout } from '../components/Layout';
import {
  ManualFeedDialog,
  type ManualFeedDialogHandle,
} from '../components/ManualFeedDialog';

export default function Home() {
  const { feedings, loading } = useFeedings();
  const dialogRef = useRef<ManualFeedDialogHandle>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFeedings = useMemo(
    () => feedings.filter((f) => f.dateLocal === today),
    [feedings, today]
  );

  return (
    <Layout>
      <div className="flex flex-col gap-4">
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
      </div>

      <ManualFeedDialog ref={dialogRef} />
    </Layout>
  );
}
