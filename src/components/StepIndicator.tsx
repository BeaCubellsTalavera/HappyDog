import type { SlotStatus } from '../types';
import { MEAL_SLOTS } from '../lib/mealSlots';

interface Props {
  statuses: SlotStatus[];
  viewingIndex: number;
}

function StepDot({ status, label, isViewing }: { status: SlotStatus; label: string; isViewing: boolean }) {
  const base = 'flex items-center justify-center rounded-full transition-all duration-200 border-2';
  const size = isViewing ? 'w-9 h-9' : 'w-7 h-7';

  const colorMap: Record<SlotStatus, string> = {
    pending:  'bg-orange-500 border-orange-500 text-white',
    given:    'bg-green-500  border-green-500  text-white',
    missed:   'bg-red-500    border-red-500    text-white',
    skipped:  'bg-amber-400  border-amber-400  text-white',
    'not-yet':'bg-white      border-gray-300   text-gray-400',
  };

  function Icon() {
    if (status === 'pending') {
      // Bowl icon (simplified SVG)
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={isViewing ? 'w-5 h-5' : 'w-4 h-4'}>
          <path d="M4 11h16a1 1 0 0 1 .97 1.24C19.84 16.31 16.28 19 12 19s-7.84-2.69-8.97-6.76A1 1 0 0 1 4 11zm2.1 2a7.02 7.02 0 0 0 11.8 0H6.1zM3 9a1 1 0 0 1 1-1h16a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1z"/>
        </svg>
      );
    }
    if (status === 'given') return <span className={isViewing ? 'text-base' : 'text-sm'}>✓</span>;
    if (status === 'missed') return <span className={isViewing ? 'text-base' : 'text-sm'}>✕</span>;
    if (status === 'skipped') {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={isViewing ? 'w-5 h-5' : 'w-4 h-4'}>
          <path d="M6 18V6l8.5 6L6 18zm8.5 0V6H17v12h-2.5z"/>
        </svg>
      );
    }
    return <span className={isViewing ? 'text-sm' : 'text-xs'}>○</span>;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${base} ${size} ${colorMap[status]}`}>
        <Icon />
      </div>
      {isViewing && (
        <span className="text-[10px] font-medium text-gray-600 tracking-wide">{label}</span>
      )}
    </div>
  );
}

export function StepIndicator({ statuses, viewingIndex }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-2">
      {MEAL_SLOTS.map((slot, i) => (
        <div key={slot.id} className="flex items-center">
          <StepDot
            status={statuses[i]}
            label={slot.label}
            isViewing={i === viewingIndex}
          />
          {i < MEAL_SLOTS.length - 1 && (
            <div className={`h-0.5 mx-1 transition-all duration-200 ${
              i < viewingIndex ? 'w-6' : 'w-4'
            } ${statuses[i] === 'given' ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
