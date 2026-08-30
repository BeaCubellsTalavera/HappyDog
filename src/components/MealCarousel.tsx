import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTodayFeedings, injectTodayFeeding } from '../hooks/useFeedings';
import { useTodaySkips } from '../hooks/useTodaySkips';
import { useMealStatus } from '../hooks/useMealStatus';
import { MEAL_SLOTS, getActiveSlotIndex } from '../lib/mealSlots';
import { createFeeding } from '../lib/feedings';
import { StepIndicator } from './StepIndicator';
import { MealCard } from './MealCard';

export function MealCarousel() {
  const { user } = useAuth();
  const feedings = useTodayFeedings((s) => s.feedings);
  const skips = useTodaySkips((s) => s.skips);
  const { createSkip } = useTodaySkips();
  const statuses = useMealStatus();
  const navigate = useNavigate();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewingIndex, setViewingIndex] = useState(() => getActiveSlotIndex(new Date()));

  // Auto-scroll to active slot on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeIdx = getActiveSlotIndex(new Date());
    const card = el.children[activeIdx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'start' });
    setViewingIndex(activeIdx);
  }, []);

  // Track which card is visible via IntersectionObserver
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = cards.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setViewingIndex(idx);
          }
        }
      },
      { root: el, threshold: 0.6 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, []);

  const handleFeed = useCallback(
    async (slotIndex: number) => {
      if (!user) return;
      const feeding = await createFeeding({
        timestamp: new Date(),
        feederUid: user.uid,
        feederName: user.displayName ?? user.email ?? 'Desconocido',
        method: 'manual',
      });
      injectTodayFeeding(feeding);
    },
    [user]
  );

  const handleSkip = useCallback(
    async (slotIndex: number) => {
      if (!user) return;
      await createSkip(
        MEAL_SLOTS[slotIndex].id,
        user.uid,
        user.displayName ?? user.email ?? 'Desconocido'
      );
    },
    [user, createSkip]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-gray-50/90 backdrop-blur-sm">
        <StepIndicator statuses={statuses} viewingIndex={viewingIndex} />
      </div>

      <div
        ref={scrollRef}
        className="flex flex-1 overflow-x-scroll snap-x snap-mandatory scroll-smooth hide-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {MEAL_SLOTS.map((slot, i) => {
          const today = new Date().toISOString().slice(0, 10);
          const slotFeeding =
            feedings.find(
              (f) =>
                f.dateLocal === today &&
                f.hourLocal >= slot.startHour &&
                f.hourLocal < slot.endHour
            ) ?? null;
          const slotSkip =
            skips.find((s) => s.date === today && s.mealSlotId === slot.id) ?? null;

          return (
            <div
              key={slot.id}
              className="flex-shrink-0 w-full h-full snap-start"
            >
              <MealCard
                slot={slot}
                status={statuses[i]}
                feeding={slotFeeding}
                skip={slotSkip}
                onFeed={() => handleFeed(i)}
                onSkip={() => handleSkip(i)}
                onNavigateHistory={() => navigate('/history')}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
