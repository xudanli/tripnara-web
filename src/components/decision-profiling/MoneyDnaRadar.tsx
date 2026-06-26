import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MONEY_DNA_AXIS_LABELS, pct } from '@/lib/decision-profiling-labels';
import type { MoneyDnaVector } from '@/types/trip-decision-profiling';

interface MoneyDnaRadarProps {
  vector: MoneyDnaVector;
  size?: number;
  className?: string;
}

const AXIS_KEYS: (keyof MoneyDnaVector)[] = [
  'experienceTendency',
  'qualityTendency',
  'timeValueTendency',
  'socialScarcityTendency',
];

export function MoneyDnaRadar({ vector, size = 180, className }: MoneyDnaRadarProps) {
  const axes = useMemo(
    () =>
      AXIS_KEYS.map((key) => ({
        key,
        label: MONEY_DNA_AXIS_LABELS[key] ?? key,
        value: pct(vector[key]),
      })),
    [vector],
  );

  const center = size / 2;
  const radius = size / 2 - 28;
  const count = axes.length;
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2;

  const polygonPoints = axes
    .map((axis, i) => {
      const angle = startAngle + i * angleStep;
      const r = radius * Math.max(0.08, axis.value / 100);
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    })
    .join(' ');

  return (
    <svg width={size} height={size} className={cn('overflow-visible', className)} aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((level) => {
        const pts = axes
          .map((_, i) => {
            const angle = startAngle + i * angleStep;
            const r = radius * level;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          })
          .join(' ');
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        );
      })}
      {axes.map((axis, i) => {
        const angle = startAngle + i * angleStep;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        const lx = center + (radius + 16) * Math.cos(angle);
        const ly = center + (radius + 16) * Math.sin(angle);
        return (
          <g key={axis.key}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.15} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-current text-[8px] opacity-65"
            >
              {axis.label}
            </text>
          </g>
        );
      })}
      <polygon
        points={polygonPoints}
        fill="hsl(var(--primary))"
        fillOpacity={0.22}
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
