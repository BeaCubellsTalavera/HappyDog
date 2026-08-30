import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithGoogle } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { InstallPrompt } from '../components/InstallPrompt';

export default function Login() {
  const { user, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      const returnTo = params.get('returnTo');
      const target = returnTo && returnTo.startsWith('/') ? returnTo : '/';
      navigate(target, { replace: true });
    }
  }, [user, loading, navigate, params]);

  async function handleGoogleLogin() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.');
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-orange-50 p-6">
      <InstallPrompt />
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-7xl select-none">🐾</div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-orange-500 tracking-tight">HappyDog</h1>
          <p className="mt-2 text-gray-500 text-sm">¿Han comido ya los perretes?</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          onClick={handleGoogleLogin}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white rounded-xl shadow-md border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {signingIn ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <GoogleIcon />
          )}
          Continuar con Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
