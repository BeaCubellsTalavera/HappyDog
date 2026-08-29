import { Layout } from '../components/Layout';
import { useFcmToken } from '../hooks/useFcmToken';

export default function Settings() {
  const permission = useFcmToken((s) => s.permission);
  const enabled = useFcmToken((s) => s.enabled);
  const loading = useFcmToken((s) => s.loading);
  const error = useFcmToken((s) => s.error);
  const enableNotifications = useFcmToken((s) => s.enableNotifications);
  const disableNotifications = useFcmToken((s) => s.disableNotifications);

  return (
    <Layout>
      <section className="pt-6 pb-4 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-800">Ajustes</h2>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <h3 className="font-medium text-gray-800">Notificaciones push</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Recibe un aviso cuando alguien dé de comer a los perros.
              </p>
            </div>

            {/* Toggle solo cuando el permiso ya está concedido */}
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

          {/* CTA inicial — permiso nunca solicitado */}
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
      </section>
    </Layout>
  );
}
