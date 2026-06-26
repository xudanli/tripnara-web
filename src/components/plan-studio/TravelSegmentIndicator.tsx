import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { travelSegmentHasData } from '@/lib/itinerary-travel-info';
import type { TravelSegment, TravelMode } from '@/types/trip';

interface TravelSegmentIndicatorProps {
  segment: TravelSegment;
  className?: string;
}

// 交通方式配置
const travelModeConfig: Record<TravelMode, { icon: string; label: string; color: string }> = {
  DRIVING: { icon: '🚗', label: '驾车', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  WALKING: { icon: '🚶', label: '步行', color: 'text-green-600 bg-green-50 border-green-200' },
  TRANSIT: { icon: '🚌', label: '公交', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  TRAIN: { icon: '🚄', label: '高铁', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  FLIGHT: { icon: '✈️', label: '飞机', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  FERRY: { icon: '⛴️', label: '轮渡', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  BICYCLE: { icon: '🚴', label: '骑行', color: 'text-lime-600 bg-lime-50 border-lime-200' },
  TAXI: { icon: '🚕', label: '出租车', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
};

// 格式化距离
function formatDistance(meters: number | null): string {
  if (!meters) return '';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// 格式化时间
function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}小时`;
}

/**
 * 交通段指示器组件
 * 显示在两个行程项之间，展示交通信息
 */
/**
 * 跨天交通：计入「到达日」顶部（非两日卡片之间）
 */
export function CrossDayTravelLeadIn({
  timing,
  onAdjustFirstActivity,
  className,
}: {
  timing: import('@/lib/inter-day-travel').InterDayTravelTiming;
  onAdjustFirstActivity?: () => void;
  className?: string;
}) {
  const { segment, fromDayNumber, suggestedDepartLabel, earliestArrivalLabel, message, isStartTooEarly } =
    timing;

  return (
    <div
      data-travel-timing-lead-in
      className={cn(
        'rounded-lg border border-border bg-muted/25 px-3 py-3 space-y-2 mb-3',
        isStartTooEarly && 'border-gate-suggest-border bg-gate-suggest/20',
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        自第 {fromDayNumber} 天衔接（计入今日交通）
      </p>
      <TravelSegmentIndicator segment={segment} />
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>{suggestedDepartLabel}</p>
        {earliestArrivalLabel && <p>{earliestArrivalLabel}</p>}
      </div>
      {message && (
        <p
          className={cn(
            'text-xs leading-relaxed rounded-md px-2.5 py-2 border',
            isStartTooEarly
              ? 'border-gate-suggest-border bg-gate-suggest/30 text-gate-suggest-foreground'
              : 'border-border bg-muted/40 text-muted-foreground',
          )}
        >
          {message}
        </p>
      )}
      {isStartTooEarly && onAdjustFirstActivity && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdjustFirstActivity}>
          调整今日首项时间
        </Button>
      )}
    </div>
  );
}

/**
 * 退房后出发：计入当日交通（非「自上一日衔接」）
 */
export function CheckoutMorningLeadIn({
  timing,
  checkoutTimeLabel,
  overnightPlaceLabel,
  onAdjustFirstActivity,
  className,
}: {
  timing: import('@/lib/day-one-arrival').DayOneDepartureTiming;
  checkoutTimeLabel?: string;
  overnightPlaceLabel?: string;
  onAdjustFirstActivity?: () => void;
  className?: string;
}) {
  const { segment, suggestedDepartLabel, earliestArrivalLabel, message, isStartTooEarly } = timing;

  return (
    <div
      data-travel-timing-lead-in
      className={cn(
        'rounded-lg border border-border bg-muted/25 px-3 py-3 space-y-2 mb-3',
        isStartTooEarly && 'border-gate-suggest-border bg-gate-suggest/20',
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        退房后出发（计入今日交通）
      </p>
      {checkoutTimeLabel && overnightPlaceLabel && (
        <p className="text-sm font-medium text-foreground">
          {checkoutTimeLabel} 退房 · {overnightPlaceLabel}
        </p>
      )}
      <TravelSegmentIndicator segment={segment} />
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>{suggestedDepartLabel}</p>
        {earliestArrivalLabel && <p>{earliestArrivalLabel}</p>}
      </div>
      {message && (
        <p
          className={cn(
            'text-xs leading-relaxed rounded-md px-2.5 py-2 border',
            isStartTooEarly
              ? 'border-gate-suggest-border bg-gate-suggest/30 text-gate-suggest-foreground'
              : 'border-border bg-muted/40 text-muted-foreground',
          )}
        >
          {message}
        </p>
      )}
      {isStartTooEarly && onAdjustFirstActivity && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdjustFirstActivity}>
          调整今日首项时间
        </Button>
      )}
    </div>
  );
}

/**
 * 当日末 → 当晚住宿（交通段记在次日 travel-info）
 */
export function OvernightCheckinTravelConnector({
  segment,
  className,
}: {
  segment: TravelSegment;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 space-y-2 mt-2',
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        前往当晚住宿
      </p>
      <TravelSegmentIndicator segment={segment} />
    </div>
  );
}

/**
 * 第一天：落地机场/火车站起点 + 至首个活动的出发建议
 */
export function DayOneArrivalLeadIn({
  arrivalStatus,
  departureTiming,
  onEditFirstItem,
  onAdjustFirstActivity,
  className,
}: {
  arrivalStatus: import('@/lib/day-one-arrival').DayOneArrivalStatus;
  departureTiming?: import('@/lib/day-one-arrival').DayOneDepartureTiming | null;
  onEditFirstItem?: () => void;
  onAdjustFirstActivity?: () => void;
  className?: string;
}) {
  const { isArrivalHub, hubLabel, message } = arrivalStatus;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/25 px-3 py-3 space-y-2 mb-3',
        !isArrivalHub && 'border-gate-suggest-border bg-gate-suggest/20',
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        第一天起点 · 落地机场 / 火车站
      </p>
      {hubLabel && (
        <p className="text-sm font-medium text-foreground">{hubLabel}</p>
      )}
      <p
        className={cn(
          'text-xs leading-relaxed rounded-md px-2.5 py-2 border',
          isArrivalHub
            ? 'border-border bg-muted/40 text-muted-foreground'
            : 'border-gate-suggest-border bg-gate-suggest/30 text-gate-suggest-foreground',
        )}
      >
        {message}
      </p>
      {!isArrivalHub && onEditFirstItem && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEditFirstItem}>
          调整首项为落地点
        </Button>
      )}
      {departureTiming && (
        <>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>{departureTiming.suggestedDepartLabel}</p>
            {departureTiming.earliestArrivalLabel && <p>{departureTiming.earliestArrivalLabel}</p>}
          </div>
          {departureTiming.message && (
            <p
              className={cn(
                'text-xs leading-relaxed rounded-md px-2.5 py-2 border',
                departureTiming.isStartTooEarly
                  ? 'border-gate-suggest-border bg-gate-suggest/30 text-gate-suggest-foreground'
                  : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {departureTiming.message}
            </p>
          )}
          {departureTiming.isStartTooEarly && onAdjustFirstActivity && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdjustFirstActivity}>
              调整首个活动时间
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export function TravelSegmentIndicator({ segment, className }: TravelSegmentIndicatorProps) {
  // ✅ 防御性检查：确保 segment 是有效对象
  if (!segment || typeof segment !== 'object') {
    return null;
  }
  
  const mode = segment.travelMode as TravelMode | null;
  const config = mode ? travelModeConfig[mode] : null;
  
  // 如果没有任何信息，不显示
  if (!segment.duration && !segment.distance && !mode) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center py-1", className)}>
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs",
        config?.color || "text-slate-600 bg-slate-50 border-slate-200"
      )}>
        {/* 交通方式图标 */}
        {config && <span>{config.icon}</span>}
        
        {/* 垂直分隔线 */}
        <div className="w-8 h-px bg-current opacity-30" />
        
        {/* 时间 */}
        {segment.duration && (
          <span className="font-medium">{formatDuration(segment.duration)}</span>
        )}
        
        {/* 距离 */}
        {segment.distance && (
          <>
            <span className="opacity-50">·</span>
            <span>{formatDistance(segment.distance)}</span>
          </>
        )}
        
        {/* 交通方式文字 */}
        {config && (
          <>
            <span className="opacity-50">·</span>
            <span>{config.label}</span>
          </>
        )}
        
        {/* 垂直分隔线 */}
        <div className="w-8 h-px bg-current opacity-30" />
      </div>
    </div>
  );
}

/**
 * 交通摘要组件
 * 显示一天的交通信息汇总
 */
interface TravelSummaryProps {
  totalDuration: number;
  totalDistance: number;
  segmentCount: number;
  className?: string;
}

export function TravelSummary({ totalDuration, totalDistance, segmentCount, className }: TravelSummaryProps) {
  if (segmentCount === 0) return null;

  return (
    <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <div className="flex items-center gap-1">
        <span>🚗</span>
        <span>今日交通:</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{formatDuration(totalDuration)}</span>
        <span>·</span>
        <span className="font-medium text-foreground">{formatDistance(totalDistance)}</span>
        <span>·</span>
        <span>{segmentCount} 段</span>
      </div>
    </div>
  );
}

export default TravelSegmentIndicator;
