import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useMealConfig } from '../hooks/useMealConfig';
import { BG_BY_ID, MEAL_IDS } from '../lib/mealSlots';
import { validateSchedule } from '../lib/scheduleValidation';
import type { MealSlotId } from '../types';

const START_OPTIONS = Array.from({ length: 24 }, (_, h) => h); // 0..23
const END_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1); // 1..24

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatHour(h: number): string {
  if (h === 24) return '24:00 (medianoche)';
  return `${pad(h)}:00`;
}

export default function ScheduleSettings() {
  const draftEnabled = useMealConfig((s) => s.draftEnabled);
  const draftMeals = useMealConfig((s) => s.draftMeals);
  const isDirty = useMealConfig((s) => s.isDirty);
  const updateMeal = useMealConfig((s) => s.updateMeal);
  const save = useMealConfig((s) => s.save);
  const discard = useMealConfig((s) => s.discard);

  // Descarta cambios pendientes al salir de la subpágina.
  useEffect(() => () => { discard(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validation = useMemo(
    () => validateSchedule(draftEnabled, draftMeals),
    [draftEnabled, draftMeals],
  );

  const sortedIds = useMemo(() => {
    return [...MEAL_IDS].sort((a, b) => draftMeals[a].startHour - draftMeals[b].startHour);
  }, [draftMeals]);

  return (
    <Layout>
      <section className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
        <div className={`flex flex-col gap-4 pt-6 ${isDirty ? '' : 'pb-6'}`}>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              aria-label="Volver a Ajustes"
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <h2 className="text-lg font-semibold text-gray-800">Horarios de comida</h2>
          </div>

          <p className="text-sm text-gray-500 -mt-2">
            Ajusta el nombre y la ventana horaria de cada toma. Los cambios afectan también a cómo se muestran las tomas pasadas en el Historial.
          </p>

          {sortedIds.map((id) => (
            <SlotEditor
              key={id}
              id={id}
              enabled={draftEnabled[id]}
              name={draftMeals[id].name}
              startHour={draftMeals[id].startHour}
              endHour={draftMeals[id].endHour}
              errors={validation.errorsBySlot[id]}
              onChange={(patch) => updateMeal(id, patch)}
            />
          ))}

          {validation.globalErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {validation.globalErrors.map((e, i) => (
                <p key={i} className="text-sm text-red-600">{e}</p>
              ))}
            </div>
          )}

          {isDirty && (
            <div className="flex gap-3 sticky bottom-0 bg-gray-50 py-2">
              <button
                onClick={discard}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={save}
                disabled={!validation.ok}
                className="flex-1 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

interface SlotEditorProps {
  id: MealSlotId;
  enabled: boolean;
  name: string;
  startHour: number;
  endHour: number;
  errors: string[];
  onChange: (patch: { name?: string; startHour?: number; endHour?: number }) => void;
}

function SlotEditor({ id, enabled, name, startHour, endHour, errors, onChange }: SlotEditorProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="relative h-16">
        <img
          src={BG_BY_ID[id]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span className="text-white font-bold tracking-wide drop-shadow">
            {name.trim() ? name.toUpperCase() : '—'}
          </span>
          {!enabled && (
            <span className="text-xs font-medium bg-white/80 text-gray-700 px-2 py-0.5 rounded-full">
              Desactivada
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Nombre</span>
          <input
            type="text"
            value={name}
            maxLength={20}
            onChange={(e) => onChange({ name: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">Inicio</span>
            <select
              value={startHour}
              onChange={(e) => onChange({ startHour: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {START_OPTIONS.map((h) => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">Fin</span>
            <select
              value={endHour}
              onChange={(e) => onChange({ endHour: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {END_OPTIONS.map((h) => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </label>
        </div>

        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 pt-1">
            {errors.map((err, i) => (
              <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                <span aria-hidden>⚠</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
