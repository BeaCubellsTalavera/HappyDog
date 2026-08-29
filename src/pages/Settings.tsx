import { Layout } from '../components/Layout';
import { useFcmToken } from '../hooks/useFcmToken';

export default function Settings() {
  const permission = useFcmToken((s) => s.permission);
  const loading = useFcmToken((s) => s.loading);
  const error = useFcmToken((s) => s.error);
  const enableNotifications = useFcmToken((s) => s.enableNotifications);

  return (
    <Layout>
      <section className="pt-6 pb-4 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-800">Ajustes</h2>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-800">Notificaciones push</h3>
          <p className="text-sm text-gray-500 mt-1">
            Recibe un aviso cuando alguien de la familia dé de comer a los perros.
          </p>

          <div className="mt-3">
            {permission === 'default' && (
              <button
                onClick={enableNotifications}
                disabled={loading}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-75 text-white font-medium rounded-2xl transition-colors"
              >
                {loading ? 'Activando…' : 'Activar notificaciones'}
              </button>
            )}
            {permission === 'granted' && (
              <p className="text-sm text-green-600 font-medium">✓ Activadas en este dispositivo</p>
            )}
            {permission === 'denied' && (
              <p className="text-sm text-gray-500">
                Bloqueadas por el navegador. Actívalas manualmente desde los ajustes del sitio.
              </p>
            )}
            {permission === 'unsupported' && (
              <p className="text-sm text-gray-500">
                Este dispositivo o navegador no soporta notificaciones push.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </section>
    </Layout>
  );
}
