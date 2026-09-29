import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { Feeding, MealSlot } from '../types';
import {
  BUCKET_SIZE,
  SLOT_COLORS,
  buildHistogramData,
  computeSlotMeans,
} from '../lib/statsUtils';

function formatBucket(x: number): string {
  const start = x;
  const end = x + BUCKET_SIZE;
  const fmt = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}

function HistogramTooltip({ active, label }: TooltipContentProps<number, string>) {
  if (!active) return null;
  const x = typeof label === 'number' ? label : Number(label);
  if (Number.isNaN(x)) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs font-medium text-gray-900 shadow-sm">
      {formatBucket(x)}
    </div>
  );
}

interface HistogramChartProps {
  feedings: Feeding[];
  activeSlots: MealSlot[];
}

const HOUR_TICKS = [0, 4, 8, 12, 16, 20, 24];

function formatHourTick(h: number): string {
  return `${h}h`;
}

export function HistogramChart({ feedings, activeSlots }: HistogramChartProps) {
  const orderedSlots = useMemo(
    () => [...activeSlots].sort((a, b) => a.startHour - b.startHour),
    [activeSlots],
  );

  const data = useMemo(
    () => buildHistogramData(feedings, orderedSlots),
    [feedings, orderedSlots],
  );

  const means = useMemo(
    () => computeSlotMeans(feedings, orderedSlots),
    [feedings, orderedSlots],
  );

  const meanLines = useMemo(
    () =>
      orderedSlots
        .map((s) => ({ id: s.id, mean: means[s.id] }))
        .filter((e): e is { id: typeof e.id; mean: number } => e.mean != null),
    [orderedSlots, means],
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, 24]}
          ticks={HOUR_TICKS}
          tickFormatter={formatHourTick}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis hide />
        <Tooltip
          content={<HistogramTooltip />}
          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
        />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
          itemSorter={null}
        />
        {orderedSlots.map((s) => (
          <Bar
            key={s.id}
            dataKey={s.id}
            name={s.name}
            fill={SLOT_COLORS[s.id]}
            stackId="slot"
            isAnimationActive={false}
          />
        ))}
        {meanLines.map((m) => (
          <ReferenceLine
            key={m.id}
            x={m.mean}
            stroke={SLOT_COLORS[m.id]}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            ifOverflow="extendDomain"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
