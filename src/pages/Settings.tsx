import { useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useFcmToken } from '../hooks/useFcmToken';
import { useMealConfig } from '../hooks/useMealConfig';
import { MEAL_SLOTS } from '../lib/mealSlots';
import type { MealSlotId } from '../types';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function windowLabel(startHour: number, endHour: number) {
  const end = endHour === 24 ? '00:00' : `${pad(endHour)}:00`;
  return `${pad(startHour)}:00–${end}`;
}

export default function Settings() {
  const permission = useFcmToken((s) => s.permission);
  const enabled = useFcmToken((s) => s.enabled);
  const loading = useFcmToken((s) => s.loading);
  const error = useFcmToken((s) => s.error);
  const enableNotifications = useFcmToken((s) => s.enableNotifications);
  const disableNotifications = useFcmToken((s) => s.disableNotifications);

  const draft = useMealConfig((s) => s.draft);
  const isDirty = useMealConfig((s) => s.isDirty);
  const saving = useMealConfig((s) => s.loading);
  const toggle = useMealConfig((s) => s.toggle);
  const save = useMealConfig((s) => s.save);
  const discard = useMealConfig((s) => s.discard);

  // Al salir de Settings sin guardar, descartar cambios pendientes
  useEffect(() => () => { discard(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const draftEnabledCount = Object.values(draft).filter(Boolean).length;

  function handleToggle(id: MealSlotId) {
    if (draft[id] && draftEnabledCount === 1) return;
    toggle(id);
  }

  return (
    <Layout>
      <section className="pt-6 pb-24 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-800">Ajustes</h2>

        {/* Notificaciones */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <h3 className="font-medium text-gray-800">Notificaciones push</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Recibe un aviso cuando alguien dé de comer a los perros.
              </p>
            </div>

            {permission === 'granted' && (
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={loading}
                onClick={enabled ? disableNotifications : enableNotifications}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                  enabled ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </div>

          {permission === 'default' && (
            <button
              onClick={enableNotifications}
              disabled={loading}
              className="mt-3 w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-75 text-white font-medium rounded-2xl transition-colors"
            >
              {loading ? 'Activando…' : 'Activar notificaciones'}
            </button>
          )}

          {permission === 'denied' && (
            <p className="text-sm text-gray-500 mt-2">
              Bloqueadas por el navegador. Actívalas manualmente desde los ajustes del sitio.
            </p>
          )}

          {permission === 'unsupported' && (
            <p className="text-sm text-gray-500 mt-2">
              Este dispositivo o navegador no soporta notificaciones push.
            </p>
          )}

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {/* Comidas */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-medium text-gray-800">Comidas</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Activa o desactiva las tomas que aplican a tus perros.
            </p>
          </div>

          <ul>
            {MEAL_SLOTS.map((slot, i) => {
              const isOn = draft[slot.id];
              const isLast = isOn && draftEnabledCount === 1;
              return (
                <li
                  key={slot.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < MEAL_SLOTS.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex-1 mr-4">
                    <p className="font-medium text-gray-800 text-sm">{slot.name}</p>
                    <p className="text-xs text-gray-400">
                      {slot.label} · {windowLabel(slot.startHour, slot.endHour)}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    disabled={isLast}
                    onClick={() => handleToggle(slot.id)}
                    title={isLast ? 'Debe haber al menos una toma activa' : undefined}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
                      isOn ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        isOn ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {isDirty && (
            <div className="px-4 pb-4 pt-3 flex gap-3 border-t border-gray-100">
              <button
                onClick={discard}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
