import type { SlotStatus } from '../types';
import type { CellData, CellPosition, DayColumn } from '../lib/weekGrid';

interface WeekGridProps {
  days: DayColumn[];
  loading: boolean;
}

const CELL_BG: Record<SlotStatus, string> = {
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
  'not-yet': { char: '✓', cls: 'text-gray-200' },
  pending:  { char: '✓', cls: 'text-gray-200' },
};

const POSITION_ROUNDED: Record<CellPosition, string> = {
  single: 'rounded-full',
  first:  'rounded-t-full rounded-b-none',
  middle: 'rounded-none',
  last:   'rounded-t-none rounded-b-full',
};

function Cell({ cell }: { cell: CellData }) {
  const { char, cls } = CELL_ICON[cell.status];
  return (
    <div
      className={`w-full aspect-square flex items-center justify-center text-xs font-bold ${POSITION_ROUNDED[cell.position]} ${CELL_BG[cell.status]}`}
    >
      <span className={cls}>{char}</span>
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
    <div className="flex gap-1 w-full pt-2">
      {days.map((day) => (
        <div
          key={day.dayStr}
          className={`flex-1 flex flex-col min-w-0${day.isToday ? ' ring-2 ring-black rounded-2xl overflow-hidden' : ''}`}
        >
          <div
            className={`text-center text-xs py-1.5 font-medium capitalize${day.isToday ? ' text-black' : ' text-gray-400'}`}
          >
            {day.label}
          </div>
          {day.cells.map((cell, i) => (
            <Cell key={i} cell={cell} />
          ))}
        </div>
      ))}
    </div>
  );
}
