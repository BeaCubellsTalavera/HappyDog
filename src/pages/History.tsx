import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useHistory } from '../hooks/useHistory';
import { Layout } from '../components/Layout';

export default function History() {
  const { days, loading, hasMore, load, loadMore } = useHistory();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  // Infinite scroll: cuando el sentinel entra en viewport, carga más.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loading) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <Layout>
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-6">
        {loading && days.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Cargando…</p>
        ) : days.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aún no hay registros</p>
        ) : (
          <>
            {days.map(({ date, label, feedings }, i) => (
              <section key={date} className={i === 0 ? '' : 'mt-6'}>
                <h2 className="sticky top-0 bg-gray-50 text-sm font-semibold text-gray-500 py-2 mb-2 capitalize z-10">
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
                        {f.method === 'nfc' ? 'NFC' : 'Manual'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div ref={sentinelRef} className="py-4 text-center">
              {loading && <span className="text-sm text-gray-400">Cargando…</span>}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
