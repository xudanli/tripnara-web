import { Link } from 'react-router-dom';
import { Compass, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTripTravelContext } from '@/features/trip-context';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { useTripWorldStateSync } from '@/hooks/useTripWorldStateSync';
import { exploreBasePath } from '@/features/exploration/constants';
import { explorationFlags } from '@/features/exploration/flags';
import { cn } from '@/lib/utils';
import { TRIP_DETAIL_NAV } from '@/lib/trip-detail-terminology.util';
import { tripDetailUi } from './trip-detail-ui';

interface TripExplorationContextStripProps {
  tripId: string;
  onOpenDecisions?: () => void;
}

/** 探索归档 — 与 travel-status / Trip Context 对齐（P0） */
export default function TripExplorationContextStrip({
  tripId,
  onOpenDecisions,
}: TripExplorationContextStripProps) {
  const {
    enabled,
    ready,
    contextId,
    statusDisplay,
    openDecisionCount: contextOpenCount,
    planView,
    overviewView,
    explorationArchive,
  } = useTripTravelContext();

  const { model, status } = useTripStatusBarModel(tripId, explorationFlags.travelContextEnabled);
  const { syncAll, isSyncing } = useTripWorldStateSync(tripId);

  if (!explorationFlags.travelContextEnabled || !enabled) return null;
  if (!ready || !contextId) return null;

  const archiveCount = Array.isArray(
    (explorationArchive as { rejectedRoutes?: unknown[] } | undefined)?.rejectedRoutes,
  )
    ? ((explorationArchive as { rejectedRoutes: unknown[] }).rejectedRoutes.length ?? 0)
    : 0;

  const bffOpenCount = status?.openDecisions?.length ?? 0;
  const alignedCount = Math.max(contextOpenCount, bffOpenCount);
  const countsAligned = contextOpenCount === bffOpenCount || bffOpenCount === 0;
  const needsSync = !countsAligned && (bffOpenCount > 0 || contextOpenCount > 0);

  return (
    <Card className="border-border shadow-none">
      <CardHeader className="px-3 py-2 pb-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Compass className="h-3.5 w-3.5" />
              探索与计划
            </CardTitle>
            <CardDescription className="text-[11px]">
              {statusDisplay.tripStageLabel} · {statusDisplay.syncLabel}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {model ? (
              <Badge variant="outline" className={tripDetailUi.tagConfirm}>
                {model.readinessLabel}
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              disabled={isSyncing}
              onClick={() => void syncAll()}
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isSyncing && 'animate-spin')} />
              同步
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        {overviewView?.summary ? (
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{overviewView.summary}</p>
        ) : null}

        {needsSync ? (
          <p className="text-xs text-gate-confirm-foreground rounded-md border border-gate-confirm-border/40 bg-gate-confirm/5 px-2.5 py-2">
            Context 与 travel-status 计数不一致，点击「同步」刷新世界状态。
          </p>
        ) : null}

        {alignedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-foreground font-medium">{alignedCount} 项需要确认</p>
            {!countsAligned && import.meta.env.DEV ? (
              <span className="text-[10px] text-muted-foreground font-mono">
                ctx {contextOpenCount} · bff {bffOpenCount}
              </span>
            ) : null}
            {onOpenDecisions ? (
              <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={onOpenDecisions}>
                {TRIP_DETAIL_NAV.openOverviewDecisions}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">探索物化后与当前计划一致，暂无待处理项</p>
        )}

        {planView?.selectedRouteId ? (
          <p className="text-xs text-muted-foreground">
            当前计划路线 <span className="font-mono">{planView.selectedRouteId}</span>
          </p>
        ) : null}
        {archiveCount > 0 ? (
          <p className="text-xs text-muted-foreground">探索阶段归档路线 {archiveCount} 条</p>
        ) : null}
        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
          <Link to={`${exploreBasePath(contextId)}/compare`}>查看探索路线对比</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
