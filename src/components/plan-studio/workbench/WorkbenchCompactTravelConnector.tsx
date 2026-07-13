import { cn } from '@/lib/utils';
import { travelSegmentHasData } from '@/lib/itinerary-travel-info';
import type { TravelSegment, TravelMode } from '@/types/trip';

const travelModeLabels: Partial<Record<TravelMode, string>> = {
  DRIVING: '驾车',
  WALKING: '步行',
  TRANSIT: '公交',
  TRAIN: '高铁',
  FLIGHT: '飞机',
  FERRY: '轮渡',
  BICYCLE: '骑行',
  TAXI: '出租车',
};

function formatDistance(meters: number | null): string | null {
  if (meters == null || meters <= 0) return null;
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}m` : `${hours} 小时`;
}

export interface WorkbenchCompactTravelConnectorProps {
  segment: TravelSegment;
  className?: string;
}

/** 编排/工作台时间轴：条目间的紧凑交通连接 */
export function WorkbenchCompactTravelConnector({
  segment,
  className,
}: WorkbenchCompactTravelConnectorProps) {
  if (!segment || !travelSegmentHasData(segment)) return null;

  const modeLabel = segment.travelMode ? travelModeLabels[segment.travelMode] : null;
  const duration = formatDuration(segment.duration);
  const distance = formatDistance(segment.distance);
  const parts = [modeLabel, duration, distance].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        'col-span-3 flex items-center gap-1.5 py-1 pl-[3.75rem] text-[10px] text-muted-foreground',
        className,
      )}
    >
      <span className="h-px min-w-[12px] flex-1 max-w-6 bg-border/70" aria-hidden />
      <span className="shrink-0 rounded-full border border-border/60 bg-muted/25 px-2 py-0.5">
        {parts.join(' · ')}
      </span>
      <span className="h-px flex-1 bg-border/70" aria-hidden />
    </div>
  );
}
