import { Fragment } from 'react';
import type { SlotStatus } from '../types';

interface Props {
  statuses: SlotStatus[];
  viewingIndex: number;
}

const statusBg: Record<SlotStatus, string> = {
  pending:   'bg-white border-2 border-gray-300',
  given:     'bg-green-500',
  missed:    'bg-red-500',
  skipped:   'bg-amber-400',
  'not-yet': 'bg-white border-2 border-gray-300',
};

function BowlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 500" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M 250,110 A 150,70 0 0,0 100,180 L 60,320 C 60,410 440,410 440,320 L 400,180 A 150,70 0 0,0 250,110 Z M 250,130 A 130,50 0 0,1 380,180 A 130,50 0 0,1 250,230 A 130,50 0 0,1 120,180 A 130,50 0 0,1 250,130 Z"
      />
    </svg>
  );
}

function StepCircle({ status, isViewing }: { status: SlotStatus; isViewing: boolean }) {
  const innerSize = isViewing ? 'w-9 h-9' : 'w-7 h-7';
  const iconSize  = isViewing ? 'w-5 h-5' : 'w-4 h-4';
  const textSize  = isViewing ? 'text-base' : 'text-sm';
  const textColor = (status === 'not-yet' || status === 'pending') ? 'text-gray-400' : 'text-white';

  function Icon() {
    if (status === 'pending')  return <BowlIcon className={iconSize} />;
    if (status === 'given')    return <span className={textSize}>✓</span>;
    if (status === 'missed')   return <span className={textSize}>✕</span>;
    if (status === 'skipped') {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconSize}>
          <path d="M6 18V6l8.5 6L6 18zm8.5 0V6H17v12h-2.5z" />
        </svg>
      );
    }
    return <span className={isViewing ? 'text-sm' : 'text-xs'}>○</span>;
  }

  return (
    <div className="w-9 h-9 flex items-center justify-center">
      <div className={`${innerSize} rounded-full flex items-center justify-center transition-all duration-200 ${statusBg[status]} ${textColor}`}>
        <Icon />
      </div>
    </div>
  );
}

export function StepIndicator({ statuses, viewingIndex }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-3">
      {statuses.map((status, i) => (
        <Fragment key={i}>
          <StepCircle status={status} isViewing={i === viewingIndex} />
          {i < statuses.length - 1 && (
            <div className="h-0.5 w-6 flex-shrink-0 bg-gray-200" />
          )}
        </Fragment>
      ))}
    </div>
  );
}
