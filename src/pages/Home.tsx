import { useEffect } from 'react';
import { useSessionMark } from '../lib/sessionMark';
import { useTodayFeedings } from '../hooks/useFeedings';
import { MealCarousel } from '../components/MealCarousel';
import { Layout } from '../components/Layout';
import { HappyDogLogo } from '../components/HappyDogLogo';

export default function Home() {
  const markSeen = useSessionMark((s) => s.markSeen);
  const feedingsLoading = useTodayFeedings((s) => s.loading);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') markSeen(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      markSeen();
    };
  }, [markSeen]);

  if (feedingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <HappyDogLogo className="text-6xl" />
      </div>
    );
  }

  return (
    <Layout>
      <MealCarousel />
    </Layout>
  );
}
