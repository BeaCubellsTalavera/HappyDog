import { useEffect, useRef, useState } from 'react';
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { createFeeding } from '../lib/feedings';

type FeedState = 'validating' | 'saving' | 'done' | 'invalid' | 'error';

export default function Feed() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<FeedState>('validating');
  const ranRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user || !token || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'nfc'));
        const configToken = snap.exists()
          ? (snap.data().token as string | undefined)
          : undefined;

        if (!configToken || configToken !== token) {
          setState('invalid');
          return;
        }

        setState('saving');
        await createFeeding({
          timestamp: new Date(),
          feederUid: user.uid,
          feederName: user.displayName ?? user.email ?? 'Desconocido',
          method: 'nfc',
        });
        setState('done');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      } catch (e) {
        console.error('Feed error:', e);
        setState('error');
      }
    })();
  }, [authLoading, user, token, navigate]);

  if (!token) return <FeedShell><p className="text-gray-500 text-sm">Enlace inválido.</p></FeedShell>;

  if (!authLoading && !user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  if (authLoading || state === 'validating') return <FeedSpinner />;
  if (state === 'invalid' || state === 'error') {
    return <FeedShell><p className="text-gray-500 text-sm">Ha ocurrido un error.</p></FeedShell>;
  }

  return <FeedConfirmation saving={state === 'saving'} />;
}

function FeedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        {children}
      </div>
    </div>
  );
}

function FeedSpinner() {
  return (
    <FeedShell>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      <p className="text-gray-500 text-sm">Validando…</p>
    </FeedShell>
  );
}

function FeedConfirmation({ saving }: { saving: boolean }) {
  return (
    <FeedShell>
      <div className="text-7xl">{saving ? '🐾' : '✅'}</div>
      <h1 className="text-3xl font-bold text-orange-500">
        {saving ? 'Anotando…' : '¡Anotado!'}
      </h1>
      <p className="text-gray-500 text-sm">
        {saving ? 'Registrando la comida' : 'Comida registrada para los perretes'}
      </p>
    </FeedShell>
  );
}

