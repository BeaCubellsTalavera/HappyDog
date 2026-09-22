import type React from 'react';
import type { SlotStatus } from '../types';
import type { CellData, CellPosition, DayColumn } from '../lib/weekGrid';

interface WeekGridProps {
  days: DayColumn[];
  loading: boolean;
}

// Outer container (pill segment): translucent color of the group
const PILL_BG: Record<SlotStatus, string> = {
  given:    'bg-green-100',
  missed:   'bg-gray-300/20',
  skipped:  'bg-transparent',
  'not-yet': 'bg-transparent',
  pending:  'bg-transparent',
};

// Inner circle: solid color
const CIRCLE_BG: Record<SlotStatus, string> = {
  given:    'bg-green-500',
  missed:   'bg-gray-300',
  skipped:  'bg-white border border-gray-200',
  'not-yet': 'bg-white border border-gray-200',
  pending:  'bg-white border border-gray-200',
};

const SKIP_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
    <path d="M6 18V6l8.5 6L6 18zm8.5 0V6H17v12h-2.5z" />
  </svg>
);

const CELL_ICON: Record<SlotStatus, { node: React.ReactNode }> = {
  given:    { node: <span className="text-xs font-bold text-white">✓</span> },
  missed:   { node: <span className="text-xs font-bold text-white">✕</span> },
  skipped:  { node: SKIP_ICON },
  'not-yet': { node: <span className="text-xs font-bold text-gray-300">✓</span> },
  pending:  { node: <span className="text-xs font-bold text-gray-300">✓</span> },
};

const POSITION_ROUNDED: Record<CellPosition, string> = {
  single: 'rounded-full',
  first:  'rounded-t-full rounded-b-none',
  middle: 'rounded-none',
  last:   'rounded-t-none rounded-b-full',
};

function Cell({ cell }: { cell: CellData }) {
  const { node } = CELL_ICON[cell.status];
  const inPill = cell.position !== 'single';
  return (
    <div className="w-full h-9 flex items-center justify-center">
      {/* Pill track: w-9 (36px) vs circle w-7 (28px) → 4px padding on all 4 sides, concentric */}
      <div className={`w-9 h-9 flex items-center justify-center ${POSITION_ROUNDED[cell.position]} ${inPill ? PILL_BG[cell.status] : 'bg-transparent'}`}>
        <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${CIRCLE_BG[cell.status]}`}>
          {node}
        </div>
      </div>
    </div>
  );
}

export function WeekGrid({ days, loading }: WeekGridProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 w-full pt-2">
      {days.map((day) => (
        <div key={day.dayStr} className="flex-1 flex flex-col min-w-0">
          <div className={`text-center text-xs py-1.5 capitalize ${day.isToday ? 'text-black font-semibold' : 'text-gray-400 font-medium'}`}>
            {day.label}
          </div>
          <div className={day.isToday ? undefined : 'opacity-60'}>
            {day.cells.map((cell, i) => (
              <Cell key={i} cell={cell} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
