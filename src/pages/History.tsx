import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFeedings } from '../hooks/useFeedings';
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center px-4 py-4 bg-white shadow-sm gap-3">
        <Link to="/" className="text-sm font-medium text-orange-500">
          ← Inicio
        </Link>
        <h1 className="text-xl font-bold text-orange-500 flex-1 text-center pr-12">
          Historial
        </h1>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Cargando…</p>
        ) : days.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aún no hay registros</p>
        ) : (
          days.map(({ date, label, feedings }) => (
            <section key={date}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2 capitalize">
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
      </main>
    </div>
  );
}
