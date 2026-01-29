import { cn } from '@/lib/utils';
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
