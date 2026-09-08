import { useEffect } from 'react';
import { useSessionMark } from '../lib/sessionMark';
import { MealCarousel } from '../components/MealCarousel';
import { Layout } from '../components/Layout';

export default function Home() {
  const markSeen = useSessionMark((s) => s.markSeen);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') markSeen(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      markSeen();
    };
  }, [markSeen]);

  return (
    <Layout>
      <MealCarousel />
    </Layout>
  );
}
