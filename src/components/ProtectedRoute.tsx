import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTodayFeedings } from '../hooks/useFeedings';
import { AppSplash } from './AppSplash';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const feedingsLoading = useTodayFeedings((s) => s.loading);

  if (authLoading) return <AppSplash />;

  if (!user) return <Navigate to="/login" replace />;


  if (feedingsLoading) return <AppSplash />;

  return <>{children}</>;
}
