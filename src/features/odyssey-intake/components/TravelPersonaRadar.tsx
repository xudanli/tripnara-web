import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SEMANTIC_BLUE_HEX } from '@/lib/semantic-colors';

interface TravelPersonaRadarProps {
  radar: Record<string, number>;
  size?: number;
  accent?: string;
  className?: string;
}

const LABEL_OVERRIDES: Record<string, string> = {
  financialFlexibility: '消费弹性',
  financial_flexibility: '消费弹性',
  planningRigidity: '计划硬度',
  planning_index: '计划硬度',
  ambiguityTolerance: '不确定性',
  ambiguity_tolerance: '不确定性',
  energyCapacity: '精力密度',
  energy_capacity: '精力密度',
  socialDrive: '社交驱动',
  social_drive: '社交驱动',
  meaningOrientation: '意义感',
  aesthetic_preference: '意义感',
  compromise_index: '妥协度',
  stress_anxiety_index: '高压焦虑',
};

function formatLabel(key: string): string {
  return LABEL_OVERRIDES[key] ?? key.replace(/_/g, ' ');
}

export function TravelPersonaRadar({
  radar,
  size = 160,
  accent = SEMANTIC_BLUE_HEX,
  className,
}: TravelPersonaRadarProps) {
  const axes = useMemo(
    () => Object.entries(radar).map(([key, value]) => ({ key, label: formatLabel(key), value })),
    [radar]
  );

  const center = size / 2;
  const radius = size / 2 - 24;
  const count = Math.max(axes.length, 3);
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2;

  const polygonPoints = axes
    .map((axis, i) => {
      const angle = startAngle + i * angleStep;
      const r = radius * Math.max(0.12, (axis.value ?? 0) / 100);
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
        const lx = center + (radius + 14) * Math.cos(angle);
        const ly = center + (radius + 14) * Math.sin(angle);
        return (
          <g key={axis.key}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.15} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-current text-[7px] opacity-60"
            >
              {axis.label}
            </text>
          </g>
        );
      })}
      <polygon
        points={polygonPoints}
        fill={accent}
        fillOpacity={0.25}
        stroke={accent}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
