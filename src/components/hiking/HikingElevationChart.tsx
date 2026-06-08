import { useMemo, useState } from 'react';
import type { ElevationProfilePoint } from '@/types/hiking';
import { cn } from '@/lib/utils';

interface HikingElevationChartProps {
  points: ElevationProfilePoint[];
  dataSource?: 'live_dem' | 'cached_fixture';
  className?: string;
}

export function HikingElevationChart({
  points,
  dataSource,
  className,
}: HikingElevationChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { pathD, fillD, maxDist, maxElev, minElev } = useMemo(() => {
    if (!points.length) {
      return { pathD: '', fillD: '', maxDist: 1, maxElev: 1, minElev: 0 };
    }
    const maxDist = Math.max(...points.map((p) => p.distance), 1);
    const elevations = points.map((p) => p.elevation);
    const maxElev = Math.max(...elevations);
    const minElev = Math.min(...elevations);
    const range = Math.max(maxElev - minElev, 1);

    const coords = points.map((p, i) => {
      const x = (p.distance / maxDist) * 100;
      const y = 100 - ((p.elevation - minElev) / range) * 88 - 6;
      return { x, y, i };
    });

    const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const fillD = `${pathD} L 100 100 L 0 100 Z`;

    return { pathD, fillD, maxDist, maxElev, minElev };
  }, [points]);

  const hovered = hoverIdx != null ? points[hoverIdx] : null;

  if (!points.length) {
    return (
      <div
        className={cn(
          'flex h-48 items-center justify-center rounded-2xl bg-muted/40 text-sm text-muted-foreground',
          className
        )}
      >
        暂无海拔剖面数据
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-2xl bg-muted/30 p-4', className)}>
      {dataSource === 'cached_fixture' && (
        <span className="absolute right-3 top-3 text-[10px] text-muted-foreground">
          演示数据
        </span>
      )}
      <p className="mb-2 text-xs text-muted-foreground">
        {hovered
          ? `${(hovered.distance / 1000).toFixed(1)} km · ${Math.round(hovered.elevation)} m · 累计爬升 ${Math.round(hovered.cumulativeAscent)} m`
          : `全程 ${(maxDist / 1000).toFixed(1)} km · 海拔 ${Math.round(minElev)}–${Math.round(maxElev)} m`}
      </p>
      <svg
        className="h-44 w-full touch-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const targetDist = ratio * maxDist;
          let best = 0;
          let bestDiff = Infinity;
          points.forEach((p, i) => {
            const d = Math.abs(p.distance - targetDist);
            if (d < bestDiff) {
              bestDiff = d;
              best = i;
            }
          });
          setHoverIdx(best);
        }}
      >
        <path d={fillD} fill="currentColor" className="text-primary/15" />
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          className="text-foreground"
        />
        {hoverIdx != null && points[hoverIdx] && (
          <line
            x1={(points[hoverIdx].distance / maxDist) * 100}
            y1="0"
            x2={(points[hoverIdx].distance / maxDist) * 100}
            y2="100"
            stroke="currentColor"
            strokeWidth="0.25"
            strokeDasharray="1,1"
            className="text-foreground/50"
          />
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>距离</span>
        <span>海拔 (m)</span>
      </div>
    </div>
  );
}
