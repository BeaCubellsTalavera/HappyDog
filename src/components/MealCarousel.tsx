import { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTodayFeedings, injectTodayFeeding } from '../hooks/useFeedings';
import { useTodaySkips } from '../hooks/useTodaySkips';
import { useMealStatus } from '../hooks/useMealStatus';
import { getActiveSlotIndex } from '../lib/mealSlots';
import { createFeeding } from '../lib/feedings';
import { StepIndicator } from './StepIndicator';
import { MealCard } from './MealCard';

export function MealCarousel() {
  const { user } = useAuth();
  const feedings = useTodayFeedings((s) => s.feedings);
  const skips = useTodaySkips((s) => s.skips);
  const { createSkip } = useTodaySkips();
  const { slots, statuses } = useMealStatus();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewingIndex, setViewingIndex] = useState(() =>
    getActiveSlotIndex(slots, new Date())
  );

  const navigateTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  }, []);

  // Auto-scroll to active slot on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeIdx = getActiveSlotIndex(slots, new Date());
    const card = el.children[activeIdx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    setViewingIndex(activeIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [slots.length]);

  const handleFeed = useCallback(
    async (_slotIndex: number) => {
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
        slots[slotIndex].id,
        user.uid,
        user.displayName ?? user.email ?? 'Desconocido'
      );
    },
    [user, createSkip, slots]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-gray-50/90 backdrop-blur-sm">
        <StepIndicator statuses={statuses} viewingIndex={viewingIndex} />
      </div>

      <div className="relative overflow-hidden flex-1 py-3">
        {viewingIndex > 0 && (
          <button
            onClick={() => navigateTo(viewingIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-white/70 backdrop-blur-sm rounded-full shadow flex items-center justify-center text-gray-700 text-lg leading-none"
            aria-label="Anterior"
          >
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex h-full overflow-x-scroll snap-x snap-mandatory scroll-smooth hide-scrollbar px-7 gap-3"
        >
          {slots.map((slot, i) => {
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
                className="flex-shrink-0 w-full h-full snap-center"
              >
                <MealCard
                  slot={slot}
                  status={statuses[i]}
                  feeding={slotFeeding}
                  skip={slotSkip}
                  onFeed={() => handleFeed(i)}
                  onSkip={() => handleSkip(i)}
                />
              </div>
            );
          })}
        </div>

        {viewingIndex < slots.length - 1 && (
          <button
            onClick={() => navigateTo(viewingIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-white/70 backdrop-blur-sm rounded-full shadow flex items-center justify-center text-gray-700 text-lg leading-none"
            aria-label="Siguiente"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
