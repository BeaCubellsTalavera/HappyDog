import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { Feeding, MealSlot } from '../types';
import { SLOT_COLORS, buildDensityData } from '../lib/kdeUtils';

const DENSITY_EPSILON = 0.01;

function DensityTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const items = payload.filter(
    (p) => typeof p.value === 'number' && p.value > DENSITY_EPSILON,
  );
  if (items.length === 0) return null;
  const h = typeof label === 'number' ? label : Number(label);
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  return (
    <div className="rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-gray-900 mb-1">{timeStr}</div>
      <ul className="flex flex-col gap-0.5">
        {items.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-gray-700">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DensityChartProps {
  feedings: Feeding[];
  activeSlots: MealSlot[];
}

const HOUR_TICKS = [0, 4, 8, 12, 16, 20, 24];

function formatHourTick(h: number): string {
  return `${h}h`;
}

export function DensityChart({ feedings, activeSlots }: DensityChartProps) {
  const orderedSlots = useMemo(
    () => [...activeSlots].sort((a, b) => a.startHour - b.startHour),
    [activeSlots],
  );

  const legendPayload = useMemo(
    () =>
      orderedSlots.map((s) => ({
        value: s.name,
        type: 'circle' as const,
        id: s.id,
        color: SLOT_COLORS[s.id],
      })),
    [orderedSlots],
  );

  const data = useMemo(
    () => buildDensityData(feedings, orderedSlots),
    [feedings, orderedSlots],
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
        <Tooltip content={<DensityTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={28}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
          payload={legendPayload}
        />
        {orderedSlots.map((s) => (
          <Area
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.name}
            stroke={SLOT_COLORS[s.id]}
            fill={SLOT_COLORS[s.id]}
            fillOpacity={0.35}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
