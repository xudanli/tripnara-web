import { cn } from '@/lib/utils';
import { useWorkbenchDecisionFocus } from '@/contexts/WorkbenchDecisionFocusContext';
import { TripRouteSummaryStrip } from '@/components/trip/TripRouteSummaryStrip';
import {
  formatWorkbenchDistanceKm,
  formatWorkbenchDurationMinutes,
  formatWorkbenchOvertime,
} from './workbench-format.util';
import type { WorkbenchRouteStats } from './useWorkbenchItineraryData';
import {
  workbenchCard,
  workbenchScheduleMetricValue,
  workbenchScheduleOvertime,
} from './workbench-ui';

export interface WorkbenchRouteSummaryBarProps {
  routeStops: string[];
  stats: WorkbenchRouteStats | null;
  onViewFullMap?: () => void;
  className?: string;
}

/** 工作台顶栏最多展示的 POI 数，超出显示 +N */
const WORKBENCH_ROUTE_SUMMARY_MAX_STOPS = 10;

/** 顶栏路线摘要 + 全程统计条（与攻略草案路线条视觉一致） */
export function WorkbenchRouteSummaryBar({
  routeStops,
  stats,
  onViewFullMap,
  className,
}: WorkbenchRouteSummaryBarProps) {
  const decisionFocus = useWorkbenchDecisionFocus();

  return (
    <div className={cn(workbenchCard, 'relative overflow-hidden', className)}>
      <TripRouteSummaryStrip
        stops={routeStops}
        onViewMap={onViewFullMap}
        viewMapLabel="查看全程地图"
        maxStops={WORKBENCH_ROUTE_SUMMARY_MAX_STOPS}
        density="compact"
        isStopHighlighted={
          decisionFocus?.isActive
            ? (stop) => decisionFocus.isRouteStopHighlighted(stop)
            : undefined
        }
        isStopDimmed={
          decisionFocus?.isActive
            ? (stop) => decisionFocus.isRouteStopDimmed(stop)
            : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 bg-background/95 px-3 py-1.5 text-[10px]">
        <Stat label="全程" value={formatWorkbenchDistanceKm(stats?.totalDistanceKm)} />
        <Stat
          label="预计驾驶"
          value={formatWorkbenchDurationMinutes(stats?.totalDriveMinutes)}
        />
        <Stat
          label="平均每日"
          value={formatWorkbenchDurationMinutes(stats?.avgDailyDriveMinutes)}
        />
        {stats && stats.overtimeMinutes > 0 ? (
          <span className={workbenchScheduleOvertime}>
            当前超限 {formatWorkbenchOvertime(stats.overtimeMinutes)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-muted-foreground">
      {label}{' '}
      <span className={workbenchScheduleMetricValue}>{value}</span>
    </span>
  );
}
