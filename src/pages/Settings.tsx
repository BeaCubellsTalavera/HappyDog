import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useFcmToken } from '../hooks/useFcmToken';
import { useMealConfig } from '../hooks/useMealConfig';
import { buildSlots, MEAL_IDS } from '../lib/mealSlots';
import { windowLabel } from '../lib/timeFormat';

export default function Settings() {
  const permission = useFcmToken((s) => s.permission);
  const enabled = useFcmToken((s) => s.enabled);
  const loading = useFcmToken((s) => s.loading);
  const error = useFcmToken((s) => s.error);
  const enableNotifications = useFcmToken((s) => s.enableNotifications);
  const disableNotifications = useFcmToken((s) => s.disableNotifications);

  const meals = useMealConfig((s) => s.meals);
  const mealCount = useMealConfig((s) => s.mealCount);
  const activeSlots = buildSlots(meals).filter((s) => MEAL_IDS.indexOf(s.id) < mealCount);

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
              {mealCount} toma{mealCount !== 1 ? 's' : ''} al día
            </p>
          </div>

          <ul>
            {activeSlots.map((slot, i) => (
              <li
                key={slot.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < activeSlots.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm">{slot.name}</p>
                  <p className="text-xs text-gray-400">{windowLabel(slot.startHour, slot.endHour)}</p>
                </div>
              </li>
            ))}
            <li className="border-t border-gray-100">
              <Link
                to="/settings/schedule"
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex-1 mr-4">
                  <p className="font-medium text-gray-800 text-sm">Editar tomas y horarios</p>
                  <p className="text-xs text-gray-400">Número de tomas, horarios y nombres</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400 shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </Layout>
  );
}
