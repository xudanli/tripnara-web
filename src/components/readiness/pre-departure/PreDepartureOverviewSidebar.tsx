import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import ScoreGauge from '@/components/readiness/ScoreGauge';
import ReadinessScoreDimensions from '@/components/readiness/ReadinessScoreDimensions';
import { readinessApi, type ScoreBreakdownResponse } from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import {
  getDaysUntilTripStart,
  getTripReadinessPhaseFromTrip,
} from '@/lib/trip-readiness-phase.util';
import { cn } from '@/lib/utils';
import {
  workbenchEmptyHint,
  workbenchPanelTitle,
  workbenchPreDepartureSidebarShell,
  workbenchPreDepartureStatusPillClass,
  workbenchSecondaryMetric,
} from '@/components/plan-studio/workbench/workbench-ui';

interface PreDepartureOverviewSidebarProps {
  tripId: string;
  trip: TripDetail | null;
  scoreBreakdown?: ScoreBreakdownResponse | null;
  loading?: boolean;
  className?: string;
}

function readinessStatusTone(
  score: number,
  blockers: number,
): { text: string; tone: 'danger' | 'warning' | 'success' | 'neutral' } {
  if (blockers > 0 || score < 60) {
    return { text: '需处理阻塞项', tone: 'danger' };
  }
  if (score < 80) {
    return { text: '良好', tone: 'warning' };
  }
  return { text: '良好', tone: 'success' };
}

export default function PreDepartureOverviewSidebar({
  tripId,
  trip,
  scoreBreakdown: scoreBreakdownProp,
  loading: loadingProp,
  className,
}: PreDepartureOverviewSidebarProps) {
  const [data, setData] = useState<ScoreBreakdownResponse | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(true);

  const controlled = scoreBreakdownProp !== undefined || loadingProp !== undefined;
  const loading = loadingProp ?? loadingLocal;
  const dataResolved = controlled ? (scoreBreakdownProp ?? null) : data;

  const load = useCallback(async () => {
    if (!tripId || controlled) return;
    try {
      setLoadingLocal(true);
      const breakdown = await readinessApi.getScoreBreakdown(tripId);
      setData(breakdown);
    } catch (err) {
      console.error('[PreDepartureOverviewSidebar] load failed:', err);
      setData(null);
    } finally {
      setLoadingLocal(false);
    }
  }, [tripId, controlled]);

  useEffect(() => {
    void load();
  }, [load]);

  const score = Math.round(dataResolved?.score?.overall ?? 0);
  const blockers = dataResolved?.summary?.blockers ?? 0;
  const must = dataResolved?.summary?.must ?? dataResolved?.summary?.warnings ?? 0;
  const status = readinessStatusTone(score, blockers);
  const phase = getTripReadinessPhaseFromTrip(trip);
  const daysUntil =
    trip?.startDate && phase !== 'past' && phase !== 'in_trip'
      ? getDaysUntilTripStart(trip.startDate)
      : null;

  return (
    <aside className={cn(workbenchPreDepartureSidebarShell, className)}>
      <p className={cn(workbenchPanelTitle, 'text-xs font-medium text-muted-foreground')}>
        准备度总览
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <LogoLoading size={28} />
        </div>
      ) : dataResolved ? (
        <div className="mt-3 space-y-4">
          <div className="flex flex-col items-center">
            <ScoreGauge score={score} size={112} />
            <span className={cn('mt-2', workbenchPreDepartureStatusPillClass(status.tone))}>
              {status.text}
            </span>
            {daysUntil != null && daysUntil > 0 ? (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                预计 {daysUntil} 天后出发
              </p>
            ) : dataResolved.phaseHint ? (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {dataResolved.phaseHint}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              className={cn(
                'rounded-lg border px-2 py-1.5 text-center',
                blockers > 0
                  ? 'border-border/50 bg-muted/8 text-error'
                  : 'border-border/50 bg-muted/20 text-muted-foreground',
              )}
            >
              <div className={cn(workbenchSecondaryMetric, 'text-base font-semibold')}>
                {blockers}
              </div>
              <div className="text-[10px]">阻塞项</div>
            </div>
            <div
              className={cn(
                'rounded-lg border px-2 py-1.5 text-center',
                must > 0
                  ? 'border-gate-confirm-border/50 bg-gate-confirm/8 text-warning'
                  : 'border-border/50 bg-muted/20 text-muted-foreground',
              )}
            >
              <div className={cn(workbenchSecondaryMetric, 'text-base font-semibold')}>{must}</div>
              <div className="text-[10px]">必须处理</div>
            </div>
          </div>

          <ReadinessScoreDimensions
            score={dataResolved.score}
            softenLowScores={blockers === 0}
            defaultCollapsed={false}
          />

          <Button variant="outline" size="sm" className="h-8 w-full rounded-lg text-[11px]" asChild>
            <a href={`/dashboard/readiness?tripId=${encodeURIComponent(tripId)}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              查看完整准备报告
            </a>
          </Button>
        </div>
      ) : (
        <p className={cn(workbenchEmptyHint, 'mt-3 py-4 text-center text-sm')}>暂无准备度数据</p>
      )}
    </aside>
  );
}
