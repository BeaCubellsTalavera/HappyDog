import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BottomNav } from './BottomNav';
import { InstallPrompt } from './InstallPrompt';

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const { user } = useAuth();

  const initials = (user?.displayName ?? user?.email ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-screen bg-gray-50 flex flex-col pb-16">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 bg-white shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-orange-500">HappyDog</h1>
        <Link
          to="/settings"
          aria-label="Ajustes"
          className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-xs hover:bg-orange-200 transition-colors"
        >
          {initials}
        </Link>
      </header>

      <InstallPrompt />

      <main className="flex-1 flex flex-col min-h-0 px-4 max-w-md mx-auto w-full">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
