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
  skipped:  'bg-amber-100',
  'not-yet': 'bg-transparent',
  pending:  'bg-transparent',
};

// Inner circle: solid color
const CIRCLE_BG: Record<SlotStatus, string> = {
  given:    'bg-green-500',
  missed:   'bg-gray-300',
  skipped:  'bg-amber-400',
  'not-yet': 'bg-white border border-gray-200',
  pending:  'bg-white border border-gray-200',
};

const CELL_ICON: Record<SlotStatus, { char: string; cls: string }> = {
  given:    { char: '✓', cls: 'text-white' },
  missed:   { char: '✕', cls: 'text-white' },
  skipped:  { char: '—', cls: 'text-white' },
  'not-yet': { char: '✓', cls: 'text-gray-300' },
  pending:  { char: '✓', cls: 'text-gray-300' },
};

const POSITION_ROUNDED: Record<CellPosition, string> = {
  single: 'rounded-full',
  first:  'rounded-t-full rounded-b-none',
  middle: 'rounded-none',
  last:   'rounded-t-none rounded-b-full',
};

function Cell({ cell }: { cell: CellData }) {
  const { char, cls } = CELL_ICON[cell.status];
  const inPill = cell.position !== 'single';
  return (
    <div className="w-full h-9 flex items-center justify-center">
      {/* Pill track: w-9 (36px) vs circle w-7 (28px) → 4px padding on all 4 sides, concentric */}
      <div className={`w-9 h-9 flex items-center justify-center ${POSITION_ROUNDED[cell.position]} ${inPill ? PILL_BG[cell.status] : 'bg-transparent'}`}>
        <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${CIRCLE_BG[cell.status]}`}>
          <span className={cls}>{char}</span>
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
