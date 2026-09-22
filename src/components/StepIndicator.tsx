import { Fragment } from 'react';
import type { SlotStatus } from '../types';
import { BowlIcon } from './icons/BowlIcon';
import { SkipIcon } from './icons/SkipIcon';

interface Props {
  statuses: SlotStatus[];
  viewingIndex: number;
}

const statusBg: Record<SlotStatus, string> = {
  pending:   'bg-white border-2 border-gray-300',
  given:     'bg-green-500',
  missed:    'bg-red-500',
  skipped:   'bg-white border border-gray-200',
  'not-yet': 'bg-white border border-gray-200',
};

function StepConnector() {
  return <div className="step-connector" />;
}

function StepCircle({ status, isViewing }: { status: SlotStatus; isViewing: boolean }) {
  const innerSize = isViewing ? 'w-9 h-9' : 'w-7 h-7';
  const iconSize  = isViewing ? 'w-5 h-5' : 'w-4 h-4';
  const textSize  = isViewing ? 'text-base' : 'text-sm';
  const textColor = (status === 'not-yet' || status === 'pending' || status === 'skipped') ? 'text-gray-400' : 'text-white';

  function Icon() {
    if (status === 'pending')  return <BowlIcon className={iconSize} />;
    if (status === 'given')    return <span className={`${textSize} font-bold`}>✓</span>;
    if (status === 'missed')   return <span className={`${textSize} font-bold`}>✕</span>;
    if (status === 'skipped')  return <SkipIcon className={iconSize} />;
    return <span className={`${textSize} font-bold`}>✓</span>;
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
          {i < statuses.length - 1 && <StepConnector />}
        </Fragment>
      ))}
    </div>
  );
}
