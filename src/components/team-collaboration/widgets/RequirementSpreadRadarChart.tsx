import { useId, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { RequirementRadarAxis } from '@/lib/collab-members-requirement.util';

interface RequirementSpreadRadarChartProps {
  axes: RequirementRadarAxis[];
  size?: number;
  className?: string;
  showIdealBand?: boolean;
}

function polarPoint(
  center: number,
  radius: number,
  angle: number,
  ratio: number,
): { x: number; y: number } {
  return {
    x: center + radius * ratio * Math.cos(angle),
    y: center + radius * ratio * Math.sin(angle),
  };
}

function polygonPoints(
  center: number,
  radius: number,
  count: number,
  values: number[],
  startAngle: number,
): string {
  return values
    .map((value, index) => {
      const angle = startAngle + (index * 2 * Math.PI) / count;
      const ratio = Math.min(1, Math.max(0, value / 100));
      const { x, y } = polarPoint(center, radius, angle, ratio);
      return `${x},${y}`;
    })
    .join(' ');
}

export function RequirementSpreadRadarChart({
  axes,
  size = 220,
  className,
  showIdealBand = true,
}: RequirementSpreadRadarChartProps) {
  const gradientId = useId();
  const center = size / 2;
  const radius = size / 2 - 36;
  const count = axes.length;
  const startAngle = -Math.PI / 2;

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const intensityValues = axes.map((axis) => axis.intensity);
  const idealInner = axes.map(() => 35);
  const idealOuter = axes.map(() => 55);

  const axisLines = useMemo(() => {
    return axes.map((_, index) => {
      const angle = startAngle + (index * 2 * Math.PI) / count;
      const end = polarPoint(center, radius, angle, 1);
      return { x1: center, y1: center, x2: end.x, y2: end.y };
    });
  }, [axes, center, count, radius, startAngle]);

  if (count === 0) {
    return (
      <div className={cn('flex items-center justify-center text-xs text-muted-foreground', className)}>
        暂无差异数据
      </div>
    );
  }

  return (
    <div className={cn('relative mx-auto', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="团队需求差异雷达图">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={polygonPoints(
              center,
              radius,
              count,
              axes.map(() => level * 100),
              startAngle,
            )}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            className="text-border"
          />
        ))}

        {axisLines.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeOpacity={0.12}
            className="text-border"
          />
        ))}

        {showIdealBand ? (
          <polygon
            points={polygonPoints(center, radius, count, idealOuter, startAngle)}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.18}
            strokeDasharray="4 4"
            className="text-muted-foreground"
          />
        ) : null}

        {showIdealBand ? (
          <polygon
            points={polygonPoints(center, radius, count, idealInner, startAngle)}
            fill="hsl(var(--muted))"
            fillOpacity={0.35}
            stroke="none"
          />
        ) : null}

        <polygon
          points={polygonPoints(center, radius, count, intensityValues, startAngle)}
          fill={`url(#${gradientId})`}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {intensityValues.map((value, index) => {
          const angle = startAngle + (index * 2 * Math.PI) / count;
          const { x, y } = polarPoint(center, radius, angle, value / 100);
          return <circle key={axes[index]!.key} cx={x} cy={y} r={3.5} fill="hsl(var(--primary))" />;
        })}
      </svg>

      {axes.map((axis, index) => {
        const angle = startAngle + (index * 2 * Math.PI) / count;
        const labelRadius = radius + 22;
        const { x, y } = polarPoint(center, labelRadius, angle, 1);
        return (
          <span
            key={axis.key}
            className="absolute max-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 text-center text-[10px] leading-tight text-muted-foreground"
            style={{ left: x, top: y }}
          >
            {axis.label}
          </span>
        );
      })}
    </div>
  );
}
