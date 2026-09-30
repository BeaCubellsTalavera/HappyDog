import { useEffect, useState } from 'react';
import { useStatsFeedings } from '../hooks/useStatsFeedings';
import { useMealConfig } from '../hooks/useMealConfig';
import { buildSlots } from '../lib/mealSlots';
import { Layout } from '../components/Layout';
import { RadialHistogramChart } from '../components/RadialHistogramChart';

export default function Stats() {
  const { feedings, loading, loaded, reload } = useStatsFeedings();
  const meals = useMealConfig((s) => s.meals);
  const enabled = useMealConfig((s) => s.enabled);
  const activeSlots = buildSlots(meals).filter((s) => enabled[s.id]);
  const [showOrphanBuckets, setShowOrphanBuckets] = useState(false);

  useEffect(() => {
    if (!loaded && !loading) reload();
  }, [loaded, loading, reload]);

  return (
    <Layout>
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-6">
        <div className="sticky top-0 bg-gray-50 z-20 pt-3 pb-2 px-4">
          <h1 className="text-lg font-semibold text-gray-900">Distribución horaria</h1>
          <p className="text-sm text-gray-500">
            {loaded ? `Últimas ${feedings.length} tomas` : 'Cargando…'}
          </p>
        </div>
        <div className="px-2 pt-2">
          {loading && !loaded ? (
            <div className="h-80 grid place-items-center text-gray-400">Cargando…</div>
          ) : feedings.length === 0 ? (
            <div className="h-80 grid place-items-center text-gray-400">
              Sin datos todavía
            </div>
          ) : (
            <>
              <RadialHistogramChart
                feedings={feedings}
                activeSlots={activeSlots}
                showOrphanBuckets={showOrphanBuckets}
              />
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-600">
                <span>Mostrar tomas fuera de horario</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showOrphanBuckets}
                  onClick={() => setShowOrphanBuckets((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    showOrphanBuckets ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      showOrphanBuckets ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
