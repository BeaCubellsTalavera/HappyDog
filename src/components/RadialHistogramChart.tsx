import { useMemo } from 'react';
import type { Feeding, MealSlot } from '../types';
import { SLOT_COLORS, computeSlotMeans, feedingHour } from '../lib/statsUtils';

interface RadialHistogramChartProps {
  feedings: Feeding[];
  activeSlots: MealSlot[];
}

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 138;
const INNER_R = 45;
const MAX_BAR_R = 122;
const LABEL_R = OUTER_R - 18;
const TICK_MAJOR_INSET = 10;
const TICK_MINOR_INSET = 5;
const MAJOR_TICKS = [0, 6, 12, 18];
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

const BUCKET_MIN = 20;
const BUCKET_HOURS = BUCKET_MIN / 60;
const BUCKET_COUNT = Math.round(24 / BUCKET_HOURS);

function hourToAngle(h: number): number {
  return (h / 24) * 2 * Math.PI - Math.PI / 2;
}

function polar(r: number, angle: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function annularSectorPath(r0: number, r1: number, a0: number, a1: number): string {
  const [xInnerStart, yInnerStart] = polar(r0, a0);
  const [xInnerEnd, yInnerEnd] = polar(r0, a1);
  const [xOuterEnd, yOuterEnd] = polar(r1, a1);
  const [xOuterStart, yOuterStart] = polar(r1, a0);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${xInnerStart} ${yInnerStart}`,
    `A ${r0} ${r0} 0 ${largeArc} 1 ${xInnerEnd} ${yInnerEnd}`,
    `L ${xOuterEnd} ${yOuterEnd}`,
    `A ${r1} ${r1} 0 ${largeArc} 0 ${xOuterStart} ${yOuterStart}`,
    'Z',
  ].join(' ');
}

export function RadialHistogramChart({ feedings, activeSlots }: RadialHistogramChartProps) {
  const orderedSlots = useMemo(
    () => [...activeSlots].sort((a, b) => a.startHour - b.startHour),
    [activeSlots],
  );

  const wedges = useMemo(() => {
    const counts = new Array<number>(BUCKET_COUNT).fill(0);
    for (const f of feedings) {
      const h = feedingHour(f);
      const idx = Math.floor(h / BUCKET_HOURS);
      if (idx < 0 || idx >= BUCKET_COUNT) continue;
      counts[idx]++;
    }
    const max = Math.max(1, ...counts);
    const items: { key: string; d: string; color: string }[] = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const c = counts[i];
      if (c === 0) continue;
      const centerHour = (i + 0.5) * BUCKET_HOURS;
      const slot = orderedSlots.find(
        (s) => centerHour >= s.startHour && centerHour < s.endHour,
      );
      if (!slot) continue;
      const r1 = INNER_R + (c / max) * (MAX_BAR_R - INNER_R);
      const a0 = hourToAngle(i * BUCKET_HOURS);
      const a1 = hourToAngle((i + 1) * BUCKET_HOURS);
      items.push({
        key: `${i}`,
        d: annularSectorPath(INNER_R, r1, a0, a1),
        color: SLOT_COLORS[slot.id],
      });
    }
    return items;
  }, [feedings, orderedSlots]);

  const meanMarks = useMemo(() => {
    const means = computeSlotMeans(feedings, orderedSlots);
    const marks: { key: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (const slot of orderedSlots) {
      const mean = means[slot.id];
      if (mean == null) continue;
      const angle = hourToAngle(mean);
      const [x1, y1] = polar(INNER_R, angle);
      const [x2, y2] = polar(OUTER_R, angle);
      marks.push({ key: slot.id, x1, y1, x2, y2, color: SLOT_COLORS[slot.id] });
    }
    return marks;
  }, [feedings, orderedSlots]);

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="clock-svg">
        <circle cx={CX} cy={CY} r={INNER_R} className="clock-ring" />
        <circle cx={CX} cy={CY} r={MAX_BAR_R} className="clock-ring" />

        {wedges.map((w) => (
          <path key={w.key} d={w.d} fill={w.color} opacity={0.85} />
        ))}

        {ALL_HOURS.map((h) => {
          const isMajor = MAJOR_TICKS.includes(h);
          const angle = hourToAngle(h);
          const inset = isMajor ? TICK_MAJOR_INSET : TICK_MINOR_INSET;
          const [x1, y1] = polar(OUTER_R - inset, angle);
          const [x2, y2] = polar(OUTER_R, angle);
          return (
            <line
              key={h}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={isMajor ? 'clock-tick-major' : 'clock-tick'}
            />
          );
        })}

        {MAJOR_TICKS.map((h) => {
          const [x, y] = polar(LABEL_R, hourToAngle(h));
          return (
            <text
              key={h}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="clock-label"
            >
              {h}h
            </text>
          );
        })}

        {meanMarks.map((m) => (
          <line
            key={m.key}
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            stroke={m.color}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
        {orderedSlots.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: SLOT_COLORS[s.id] }}
            />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
