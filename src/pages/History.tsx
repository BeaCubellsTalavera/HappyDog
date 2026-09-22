import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useHistory } from '../hooks/useHistory';
import { useWeekFeedings } from '../hooks/useWeekFeedings';
import { useMealConfig } from '../hooks/useMealConfig';
import { MEAL_SLOTS } from '../lib/mealSlots';
import { buildWeekGrid } from '../lib/weekGrid';
import { Layout } from '../components/Layout';
import { WeekGrid } from '../components/WeekGrid';
import { ManualFeedDialog, type ManualFeedDialogHandle } from '../components/ManualFeedDialog';

export default function History() {
  const [view, setView] = useState<'chart' | 'list'>('chart');

  const { days, loading: listLoading, hasMore, load, loadMore } = useHistory();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pastDialogRef = useRef<ManualFeedDialogHandle>(null);

  const { feedings: weekFeedings, loading: weekLoading } = useWeekFeedings();
  const enabled = useMealConfig((s) => s.enabled);
  const enabledSlots = MEAL_SLOTS.filter((s) => enabled[s.id]);

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const gridDays = buildWeekGrid(enabledSlots, weekFeedings, todayStr, now);

  useEffect(() => {
    if (view === 'list') load();
  }, [view, load]);

  useEffect(() => {
    if (view !== 'list' || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !listLoading) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [view, hasMore, listLoading, loadMore]);

  return (
    <Layout>
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-6">
        <div className="sticky top-0 bg-gray-50 z-20 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex bg-gray-100 rounded-full p-0.5 text-sm">
              <button
                onClick={() => setView('chart')}
                className={`px-5 py-1.5 rounded-full transition-colors ${
                  view === 'chart' ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500'
                }`}
              >
                Gráficos
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-5 py-1.5 rounded-full transition-colors ${
                  view === 'list' ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500'
                }`}
              >
                Lista
              </button>
            </div>
            <button
              onClick={() => pastDialogRef.current?.open()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Registrar
            </button>
          </div>
        </div>

        {view === 'chart' ? (
          <WeekGrid days={gridDays} loading={weekLoading} />
        ) : (
          <>
            {listLoading && days.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Cargando…</p>
            ) : days.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Aún no hay registros</p>
            ) : (
              <>
                {days.map(({ date, label, feedings }, i) => (
                  <section key={date} className={i === 0 ? '' : 'mt-6'}>
                    <h2 className="sticky top-16 bg-gray-50 text-sm font-semibold text-gray-500 py-2 mb-2 capitalize z-10">
                      {label}
                    </h2>
                    <div className="flex flex-col gap-2">
                      {feedings.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
                        >
                          <span className="text-sm font-medium text-gray-500 w-12 shrink-0 tabular-nums">
                            {format(f.timestamp.toDate(), 'HH:mm')}
                          </span>
                          <span className="flex-1 text-sm text-gray-900 truncate">
                            {f.feederName}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                              f.method === 'nfc'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {f.method === 'nfc' ? 'NFC' : f.method === 'skipped' ? 'Saltada' : 'Manual'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
                <div ref={sentinelRef} className="py-4 text-center">
                  {listLoading && <span className="text-sm text-gray-400">Cargando…</span>}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ManualFeedDialog ref={pastDialogRef} pastMode />
    </Layout>
  );
}
