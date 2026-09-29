import { useMemo } from 'react';
import type { Feeding, MealSlot } from '../types';
import { SLOT_COLORS, computeSlotMeans, feedingHour } from '../lib/statsUtils';

interface RadialClockChartProps {
  feedings: Feeding[];
  activeSlots: MealSlot[];
}

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 138;
const RING_INNER = 55;
const RING_OUTER = 122;
const LABEL_R = OUTER_R - 18;
const TICK_MAJOR_INSET = 10;
const TICK_MINOR_INSET = 5;
const MAJOR_TICKS = [0, 6, 12, 18];
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourToAngle(h: number): number {
  return (h / 24) * 2 * Math.PI - Math.PI / 2;
}

function polar(r: number, angle: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

export function RadialClockChart({ feedings, activeSlots }: RadialClockChartProps) {
  const orderedSlots = useMemo(
    () => [...activeSlots].sort((a, b) => a.startHour - b.startHour),
    [activeSlots],
  );

  const ringForSlot = useMemo(() => {
    const map: Record<string, number> = {};
    const n = orderedSlots.length;
    const step = n > 1 ? (RING_OUTER - RING_INNER) / (n - 1) : 0;
    orderedSlots.forEach((s, i) => {
      map[s.id] = n > 1 ? RING_INNER + i * step : (RING_INNER + RING_OUTER) / 2;
    });
    return map;
  }, [orderedSlots]);

  const meanMarks = useMemo(() => {
    const means = computeSlotMeans(feedings, orderedSlots);
    const marks: { key: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (const slot of orderedSlots) {
      const mean = means[slot.id];
      if (mean == null) continue;
      const r = ringForSlot[slot.id];
      const angle = hourToAngle(mean);
      const [x1, y1] = polar(r, angle);
      const [x2, y2] = polar(OUTER_R, angle);
      marks.push({ key: slot.id, x1, y1, x2, y2, color: SLOT_COLORS[slot.id] });
    }
    return marks;
  }, [feedings, orderedSlots, ringForSlot]);

  const dots = useMemo(() => {
    const result: { key: string; x: number; y: number; color: string }[] = [];
    feedings.forEach((f, i) => {
      const slot = orderedSlots.find(
        (s) => f.hourLocal >= s.startHour && f.hourLocal < s.endHour,
      );
      if (!slot) return;
      const r = ringForSlot[slot.id];
      const [x, y] = polar(r, hourToAngle(feedingHour(f)));
      result.push({ key: `${i}`, x, y, color: SLOT_COLORS[slot.id] });
    });
    return result;
  }, [feedings, orderedSlots, ringForSlot]);

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="clock-svg">
        {orderedSlots.map((s) => (
          <circle key={s.id} cx={CX} cy={CY} r={ringForSlot[s.id]} className="clock-ring" />
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

        {dots.map((d) => (
          <circle key={d.key} cx={d.x} cy={d.y} r={3.5} fill={d.color} opacity={0.65} />
        ))}

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
