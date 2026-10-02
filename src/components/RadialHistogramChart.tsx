import { useMemo, useState } from 'react';
import type { Feeding, MealSlot } from '../types';
import {
  ORPHAN_BUCKET_COLOR,
  OUT_OF_SLOT_COLOR,
  SLOT_COLORS,
  computeSlotMeans,
  feedingHour,
  formatHourRange,
  logicalToCalendarHour,
} from '../lib/statsUtils';
import { DAY_CUTOFF_HOUR, slotLogicalBounds } from '../lib/logicalDay';

interface RadialHistogramChartProps {
  feedings: Feeding[];
  activeSlots: MealSlot[];
  showOrphanBuckets?: boolean;
}

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 120;
const INNER_R = 45;
const MAX_BAR_R = 104;
const HOVER_INNER_R = 12;
const LABEL_GAP = 8;
const LABEL_R = OUTER_R + LABEL_GAP;
const TICK_MAJOR_INSET = 10;
const TICK_AUX_INSET = 8;
const TICK_MINOR_INSET = 5;
const MAJOR_TICKS = [0, 6, 12, 18];
const AUX_TICKS = [3, 9, 15, 21];
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const GUIDE_FRACTIONS = [0.25, 0.5, 0.75];

const BUCKET_MIN = 20;
const BUCKET_HOURS = BUCKET_MIN / 60;
const BUCKET_COUNT = Math.round(24 / BUCKET_HOURS);
const WEDGE_GAP_RAD = (0.6 * Math.PI) / 180;

/** Ángulo para una hora calendar (0 = arriba, 6 = derecha, 12 = abajo, 18 = izquierda). */
function hourToAngle(calendarH: number): number {
  return (calendarH / 24) * 2 * Math.PI - Math.PI / 2;
}

/** Ángulo para una hora en espacio lógico (0 = calendar DAY_CUTOFF_HOUR). */
function logicalHourToAngle(logicalH: number): number {
  return hourToAngle(logicalH + DAY_CUTOFF_HOUR);
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

export function RadialHistogramChart({
  feedings,
  activeSlots,
  showOrphanBuckets = false,
}: RadialHistogramChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const orderedSlots = useMemo(
    () =>
      [...activeSlots].sort(
        (a, b) => slotLogicalBounds(a).logStart - slotLogicalBounds(b).logStart,
      ),
    [activeSlots],
  );

  const wedges = useMemo(() => {
    type BucketBreakdown = {
      slotColor: string | null;
      slotCount: number;
      orphanCount: number;
      outOfSlotCount: number;
    };
    const buckets: BucketBreakdown[] = Array.from({ length: BUCKET_COUNT }, () => ({
      slotColor: null,
      slotCount: 0,
      orphanCount: 0,
      outOfSlotCount: 0,
    }));

    for (const f of feedings) {
      const h = feedingHour(f);
      const idx = Math.floor(h / BUCKET_HOURS);
      if (idx < 0 || idx >= BUCKET_COUNT) continue;
      if (f.outOfSlot) {
        buckets[idx].outOfSlotCount++;
        continue;
      }
      const centerHour = (idx + 0.5) * BUCKET_HOURS;
      const slot = orderedSlots.find((s) => {
        const { logStart, logEnd } = slotLogicalBounds(s);
        return centerHour >= logStart && centerHour < logEnd;
      });
      if (slot) {
        buckets[idx].slotCount++;
        buckets[idx].slotColor = SLOT_COLORS[slot.id];
      } else {
        buckets[idx].orphanCount++;
      }
    }

    const effectiveCounts = buckets.map((b) =>
      showOrphanBuckets ? b.slotCount + b.orphanCount + b.outOfSlotCount : b.slotCount,
    );
    const max = Math.max(1, ...effectiveCounts);
    const scale = (MAX_BAR_R - INNER_R) / max;

    const items: { key: string; d: string; color: string }[] = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const b = buckets[i];
      const visibleTotal = showOrphanBuckets
        ? b.slotCount + b.orphanCount + b.outOfSlotCount
        : b.slotCount;
      if (visibleTotal === 0) continue;
      const a0 = logicalHourToAngle(i * BUCKET_HOURS) + WEDGE_GAP_RAD / 2;
      const a1 = logicalHourToAngle((i + 1) * BUCKET_HOURS) - WEDGE_GAP_RAD / 2;
      let rCurrent = INNER_R;

      if (b.slotCount > 0 && b.slotColor) {
        const rNext = rCurrent + b.slotCount * scale;
        items.push({
          key: `${i}-slot`,
          d: annularSectorPath(rCurrent, rNext, a0, a1),
          color: b.slotColor,
        });
        rCurrent = rNext;
      }
      if (showOrphanBuckets && b.orphanCount > 0) {
        const rNext = rCurrent + b.orphanCount * scale;
        items.push({
          key: `${i}-orphan`,
          d: annularSectorPath(rCurrent, rNext, a0, a1),
          color: ORPHAN_BUCKET_COLOR,
        });
        rCurrent = rNext;
      }
      if (showOrphanBuckets && b.outOfSlotCount > 0) {
        const rNext = rCurrent + b.outOfSlotCount * scale;
        items.push({
          key: `${i}-oos`,
          d: annularSectorPath(rCurrent, rNext, a0, a1),
          color: OUT_OF_SLOT_COLOR,
        });
        rCurrent = rNext;
      }
    }
    return items;
  }, [feedings, orderedSlots, showOrphanBuckets]);

  const meanMarks = useMemo(() => {
    const means = computeSlotMeans(feedings, orderedSlots);
    const marks: { key: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (const slot of orderedSlots) {
      const mean = means[slot.id];
      if (mean == null) continue;
      const angle = logicalHourToAngle(mean);
      const [x1, y1] = polar(INNER_R, angle);
      const [x2, y2] = polar(OUTER_R, angle);
      marks.push({ key: slot.id, x1, y1, x2, y2, color: SLOT_COLORS[slot.id] });
    }
    return marks;
  }, [feedings, orderedSlots]);

  const hoverBuckets = useMemo(() => {
    const items: { idx: number; d: string }[] = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const a0 = logicalHourToAngle(i * BUCKET_HOURS);
      const a1 = logicalHourToAngle((i + 1) * BUCKET_HOURS);
      items.push({ idx: i, d: annularSectorPath(HOVER_INNER_R, OUTER_R, a0, a1) });
    }
    return items;
  }, []);

  const highlightPath = hovered !== null ? hoverBuckets[hovered].d : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="clock-svg"
        onMouseLeave={() => setHovered(null)}
      >
        <circle cx={CX} cy={CY} r={INNER_R} className="clock-frame" />
        {GUIDE_FRACTIONS.map((f) => (
          <circle
            key={f}
            cx={CX}
            cy={CY}
            r={INNER_R + f * (MAX_BAR_R - INNER_R)}
            className="clock-guide"
          />
        ))}
        <circle cx={CX} cy={CY} r={MAX_BAR_R} className="clock-frame" />

        {highlightPath && (
          <path d={highlightPath} className="clock-hover-bg" pointerEvents="none" />
        )}

        {wedges.map((w) => (
          <path key={w.key} d={w.d} fill={w.color} opacity={0.85} />
        ))}

        {ALL_HOURS.map((h) => {
          const isMajor = MAJOR_TICKS.includes(h);
          const isAux = AUX_TICKS.includes(h);
          const angle = hourToAngle(h);
          const inset = isMajor ? TICK_MAJOR_INSET : isAux ? TICK_AUX_INSET : TICK_MINOR_INSET;
          const [x1, y1] = polar(OUTER_R - inset, angle);
          const [x2, y2] = polar(OUTER_R, angle);
          const cls = isMajor ? 'clock-tick-major' : isAux ? 'clock-tick-aux' : 'clock-tick';
          return (
            <line
              key={h}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={cls}
            />
          );
        })}

        {MAJOR_TICKS.map((h) => {
          // Alineación por dirección para que el gap visible entre el aro y
          // el borde interior del texto sea el mismo en las cuatro esquinas.
          let x = CX;
          let y = CY;
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          let dominantBaseline: 'middle' | 'hanging' | 'alphabetic' = 'middle';
          if (h === 0) {
            y = CY - LABEL_R;
            dominantBaseline = 'alphabetic';
          } else if (h === 6) {
            x = CX + LABEL_R;
            textAnchor = 'start';
          } else if (h === 12) {
            y = CY + LABEL_R;
            dominantBaseline = 'hanging';
          } else {
            x = CX - LABEL_R;
            textAnchor = 'end';
          }
          return (
            <text
              key={h}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
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

        {hovered !== null && (
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="clock-hover-label"
          >
            {formatHourRange(logicalToCalendarHour(hovered * BUCKET_HOURS), BUCKET_HOURS)}
          </text>
        )}

        {hoverBuckets.map((b) => (
          <path
            key={`h${b.idx}`}
            d={b.d}
            fill="transparent"
            pointerEvents="all"
            onMouseEnter={() => setHovered(b.idx)}
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
        {showOrphanBuckets && (
          <>
            <li className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: ORPHAN_BUCKET_COLOR }}
              />
              Fuera de horario
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: OUT_OF_SLOT_COLOR }}
              />
              Fuera de slot
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
