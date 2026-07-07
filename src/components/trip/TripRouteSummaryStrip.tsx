import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ROUTE_PATH_D =
  'M40,70 C160,30 280,90 400,55 S640,25 760,65';

export interface TripRouteSummaryStripProps {
  stops: string[];
  onViewMap?: () => void;
  viewMapLabel?: string;
  /** 不传则展示全部站点（按路径均匀分布） */
  maxStops?: number;
  /** 工作台等窄栏场景 · 压缩路线可视化高度 */
  density?: 'default' | 'compact';
  /** 决策焦点：高亮相关站点 */
  isStopHighlighted?: (stopName: string, index: number) => boolean;
  /** 决策焦点：降低非相关站点视觉权重 */
  isStopDimmed?: (stopName: string, index: number) => boolean;
  className?: string;
  chipClassName?: string;
}

/** 行程路线摘要：波浪路径 + POI 胶囊（攻略草案 / 规划工作台共用） */
export function TripRouteSummaryStrip({
  stops,
  onViewMap,
  viewMapLabel = '查看地图',
  maxStops,
  density = 'default',
  isStopHighlighted,
  isStopDimmed,
  className,
  chipClassName,
}: TripRouteSummaryStripProps) {
  const visibleStops = maxStops != null ? stops.slice(0, maxStops) : stops;
  const compact = density === 'compact';

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted/20',
        compact ? 'h-16' : 'h-28',
        className,
      )}
    >
      <svg
        viewBox="0 0 800 120"
        className="absolute inset-0 h-full w-full text-muted-foreground/20"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={ROUTE_PATH_D}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <svg
        viewBox="0 0 800 120"
        className="absolute inset-0 h-full w-full text-muted-foreground/35"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={ROUTE_PATH_D}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {visibleStops.map((stop, i, arr) => {
        const x = 40 + (i / Math.max(arr.length - 1, 1)) * 720;
        const y = 70 - Math.sin((i / Math.max(arr.length - 1, 1)) * Math.PI) * 28;
        const highlighted = isStopHighlighted?.(stop, i) ?? false;
        const dimmed = isStopDimmed?.(stop, i) ?? false;
        return (
          <span
            key={`${stop}-${i}`}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 max-w-[72px] truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium shadow-none transition-opacity',
              highlighted
                ? 'border-primary/50 bg-primary/10 font-semibold text-foreground ring-1 ring-primary/25'
                : 'border-border/70 bg-background text-foreground',
              dimmed && 'opacity-35',
              chipClassName,
            )}
            style={{ left: `${(x / 800) * 100}%`, top: `${(y / 120) * 100}%` }}
            title={stop}
          >
            {stop}
          </span>
        );
      })}
      {maxStops != null && stops.length > maxStops ? (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-muted/80 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
          style={{ left: '96%', top: '58%' }}
          title={stops.slice(maxStops).join(' · ')}
        >
          +{stops.length - maxStops}
        </span>
      ) : null}
      {onViewMap ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(
            'absolute bg-background/90',
            compact
              ? 'right-2 top-2 h-7 px-2 text-[10px]'
              : 'right-3 top-3 h-8 text-xs',
          )}
          onClick={onViewMap}
        >
          <Map className={cn(compact ? 'mr-0.5 h-3 w-3' : 'mr-1 h-3.5 w-3.5')} />
          {viewMapLabel}
        </Button>
      ) : null}
    </div>
  );
}
