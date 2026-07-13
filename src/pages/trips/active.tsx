import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Compass, Loader2, MapPin } from 'lucide-react';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useActiveTripDashboard,
  useDecisionReplay,
  useTemplateBackflowPreview,
} from '@/features/active-trip/hooks/useActiveTripDashboard';
import { CrewDnaPanel } from '@/features/active-trip/components/CrewDnaPanel';
import { ContextualCardsToolbox } from '@/features/active-trip/components/ContextualCardsToolbox';
import { ActiveTripTasksSection } from '@/features/active-trip/components/ActiveTripTasksSection';
import { DecisionBarPanel } from '@/features/active-trip/components/DecisionBarPanel';
import { RouteContractLockSection } from '@/features/active-trip/components/RouteContractLockSection';
import { DecisionReplayPanel } from '@/features/active-trip/components/DecisionReplayPanel';
import { TemplateBackflowPreviewPanel } from '@/features/active-trip/components/TemplateBackflowPreviewPanel';
import { trackActiveTripDashboardView } from '@/utils/active-trip-analytics';

const AWAITING_LABELS: Record<string, string> = {
  none: '',
  confirm_rollback_proposal: '待确认 rollback 提案',
  complete_assigned_task: '待完成指派任务',
  authorize_vault_milestone: '待签署 Vault 里程碑',
};

/** §3.12 · Active Trip Dashboard — GET /trips/:tripId/active */
export default function ActiveTripPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: dashboard, isLoading, isError, refetch } = useActiveTripDashboard(tripId);
  const { data: replay } = useDecisionReplay(tripId, Boolean(dashboard));
  const { data: backflow } = useTemplateBackflowPreview(tripId, Boolean(dashboard));
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!dashboard || trackedRef.current) return;
    trackedRef.current = true;
    trackActiveTripDashboardView({
      tripId: dashboard.trip.tripId,
      contextualCardIds: dashboard.contextualCards.map((c) => c.cardId),
      taskPending: dashboard.taskSummary.pending,
      awaitingViewerAction: dashboard.viewer.awaitingViewerAction,
    });
  }, [dashboard]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LogoLoading size={40} />
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Active Trip Dashboard 加载失败</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
          {tripId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/dashboard/trips/${tripId}`}>打开行程详情</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { trip, viewer, trustedProject } = dashboard;
  const awaitingLabel = AWAITING_LABELS[viewer.awaitingViewerAction];

  return (
    <div className="mx-auto min-h-full w-full max-w-3xl px-4 py-6 sm:px-6">
      <DashboardSubpageHeader
        backTo={trustedProject?.recruitmentPostId
          ? `/dashboard/trusted-projects/${trustedProject.recruitmentPostId}`
          : `/dashboard/trips/${trip.tripId}`}
        title={trip.name}
        subtitle="Active Trip · 行中指挥台"
        maxWidth="3xl"
      />

      <div className="mt-4 space-y-4">
        <header className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
                {trip.destination || '—'}
              </p>
              {(trip.startDate || trip.endDate) && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  {trip.startDate} → {trip.endDate}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {trip.status}
              </Badge>
              <Badge variant="outline" className="font-normal">
                {viewer.role === 'captain' ? '队长视角' : '队员视角'}
              </Badge>
              {awaitingLabel && (
                <Badge className="bg-primary/90 text-[10px] font-normal">{awaitingLabel}</Badge>
              )}
            </div>
          </div>

          {trustedProject && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <Compass className="h-3 w-3 shrink-0" aria-hidden />
              可信项目 · {trustedProject.strategy}
              {trustedProject.catalogId && (
                <span className="ml-1">· 模板 {trustedProject.catalogId}</span>
              )}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/dashboard/trips/${trip.tripId}`}>完整行程</Link>
            </Button>
            {trustedProject?.recruitmentPostId && (
              <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
                <Link to={`/dashboard/trusted-projects/${trustedProject.recruitmentPostId}`}>
                  可信项目
                </Link>
              </Button>
            )}
          </div>
        </header>

        {viewer.awaitingViewerAction !== 'none' && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground'
            )}
            role="status"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
            行动提示：{awaitingLabel}
          </div>
        )}

        <DecisionBarPanel dashboard={dashboard} />
        <ActiveTripTasksSection dashboard={dashboard} />
        <CrewDnaPanel crew={dashboard.crewDnaPanel} />
        <ContextualCardsToolbox cards={dashboard.contextualCards} />
        {dashboard.routeContractLock && (
          <RouteContractLockSection dashboard={dashboard} />
        )}
        {replay && <DecisionReplayPanel replay={replay} />}
        {backflow && (
          <TemplateBackflowPreviewPanel
            preview={backflow}
            tripId={trip.tripId}
            viewerRole={viewer.role}
          />
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <Button size="sm" variant="ghost" className="h-7" asChild>
            <Link to={`/dashboard/trips/${trip.tripId}/replay`}>Decision Replay 子页</Link>
          </Button>
          {backflow?.canBackflow && (
            <Button size="sm" variant="ghost" className="h-7" asChild>
              <Link to={`/dashboard/trips/${trip.tripId}/backflow`}>模板回流子页</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
