import { useMemo } from 'react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFeedings } from '../hooks/useFeedings';
import { Layout } from '../components/Layout';
import type { Feeding } from '../types';

function dayLabel(dateLocal: string): string {
  const d = parseISO(dateLocal);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "EEEE, d 'de' MMMM", { locale: es });
}

export default function History() {
  const { feedings, loading } = useFeedings();

  const days = useMemo(() => {
    const byDay = feedings.reduce<Record<string, Feeding[]>>((acc, f) => {
      (acc[f.dateLocal] ??= []).push(f);
      return acc;
    }, {});
    return Object.keys(byDay)
      .sort()
      .reverse()
      .map((date) => ({ date, label: dayLabel(date), feedings: byDay[date] }));
  }, [feedings]);

  return (
    <Layout>
      <div className="flex flex-col gap-6 h-full overflow-y-auto py-6 pb-4">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Cargando…</p>
        ) : days.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aún no hay registros</p>
        ) : (
          days.map(({ date, label, feedings }) => (
            <section key={date}>
              <h2 className="sticky top-0 bg-gray-50 text-sm font-semibold text-gray-500 py-2 mb-1 capitalize z-10">
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
          ))
        )}
      </div>
    </Layout>
  );
}
