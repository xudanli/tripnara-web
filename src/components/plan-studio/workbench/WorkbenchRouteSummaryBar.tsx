import { Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CoverageMiniMap from '@/components/readiness/CoverageMiniMap';
import type { CoverageMapResponse } from '@/api/readiness';
import {
  formatWorkbenchDistanceKm,
  formatWorkbenchDurationMinutes,
  formatWorkbenchOvertime,
} from './workbench-format.util';
import type { WorkbenchRouteStats } from './useWorkbenchItineraryData';
import {
  workbenchCard,
  workbenchMapOverlay,
  workbenchScheduleMetricValue,
  workbenchScheduleOvertime,
} from './workbench-ui';

export interface WorkbenchRouteSummaryBarProps {
  coverageMap: CoverageMapResponse | null;
  stats: WorkbenchRouteStats | null;
  loading?: boolean;
  onViewFullMap?: () => void;
  className?: string;
}

/** 顶栏路线地图 + 全程统计条（设计稿样式） */
export function WorkbenchRouteSummaryBar({
  coverageMap,
  stats,
  loading = false,
  onViewFullMap,
  className,
}: WorkbenchRouteSummaryBarProps) {
  return (
    <div className={cn(workbenchCard, 'relative overflow-hidden', className)}>
      <div className="relative h-[148px] w-full overflow-hidden bg-muted/30">
        {coverageMap || loading ? (
          <div className="absolute inset-0 [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
            <CoverageMiniMap
              data={coverageMap}
              loading={loading}
              height={148}
              compact
              className="h-full rounded-none border-0 bg-transparent shadow-none"
            />
          </div>
        ) : (
          <div className="absolute inset-0 opacity-40">
            <svg viewBox="0 0 400 120" className="h-full w-full" preserveAspectRatio="none">
              <path
                d="M20,80 C80,20 140,100 200,50 S320,30 380,70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted-foreground/40"
                strokeLinecap="round"
              />
              <path
                d="M20,80 C80,20 140,100 200,50 S320,30 380,70"
                fill="none"
                stroke="var(--gate-reject-foreground)"
                strokeWidth="2"
                strokeDasharray="6 4"
                strokeLinecap="round"
                opacity="0.55"
              />
            </svg>
          </div>
        )}
        <div className={workbenchMapOverlay} />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/50 bg-background/95 px-4 py-2.5 text-[11px]">
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
        <div className="ml-auto">
          {onViewFullMap ? (
            <Button
              variant="ghost"
              size="sm"
              className="pointer-events-auto h-7 gap-1.5 px-2 text-[11px] text-foreground hover:text-foreground"
              onClick={onViewFullMap}
            >
              <Map className="h-3.5 w-3.5" />
              查看全程地图
            </Button>
          ) : null}
        </div>
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
