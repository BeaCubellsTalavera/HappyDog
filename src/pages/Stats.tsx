import { useEffect, useState } from 'react';
import { useStatsFeedings } from '../hooks/useStatsFeedings';
import { useMealConfig } from '../hooks/useMealConfig';
import { buildSlots } from '../lib/mealSlots';
import { Layout } from '../components/Layout';
import { RadialHistogramChart } from '../components/RadialHistogramChart';
import { EyeIcon } from '../components/icons/EyeIcon';

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
        <div className="relative px-2 pt-2">
          {loading && !loaded ? (
            <div className="h-80 grid place-items-center text-gray-400">Cargando…</div>
          ) : feedings.length === 0 ? (
            <div className="h-80 grid place-items-center text-gray-400">
              Sin datos todavía
            </div>
          ) : (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={showOrphanBuckets}
                aria-label="Mostrar tomas fuera de horario"
                title="Mostrar tomas fuera de horario"
                onClick={() => setShowOrphanBuckets((v) => !v)}
                className={`absolute top-2 left-2 z-10 p-1.5 rounded-md transition-colors hover:bg-gray-100 ${
                  showOrphanBuckets ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                <EyeIcon open={showOrphanBuckets} className="w-5 h-5" />
              </button>
              <RadialHistogramChart
                feedings={feedings}
                activeSlots={activeSlots}
                showOrphanBuckets={showOrphanBuckets}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
