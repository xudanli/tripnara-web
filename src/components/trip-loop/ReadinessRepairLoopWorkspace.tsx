import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FeasibilityReportPanel } from '@/components/feasibility-report/FeasibilityReportPanel';
import { DecisionProfilingHubDialog } from '@/components/decision-profiling';
import { useReadinessRepairLoop } from '@/hooks/useReadinessRepairLoop';
import { isTripLoopReadinessEnabled } from '@/lib/trip-loop-feature';
import {
  notifyFeasibilityIssueFocus,
  notifyLoopReadinessChanged,
  notifyFeasibilityReportReload,
} from '@/lib/plan-studio-loop-events';
import type { DecisionProfilingSurface } from '@/lib/decision-profiling-navigation';
import { resolveLoopChecklistNavigateTarget } from '@/lib/loop-checklist-navigation';
import { cn } from '@/lib/utils';
import type { TripLoopChecklistItem } from '@/types/trip-loop';
import { ReadinessRepairLoopPanel } from './ReadinessRepairLoopPanel';

export interface ReadinessRepairLoopWorkspaceProps {
  tripId: string;
  initialIssueId?: string | null;
  variant?: 'sheet' | 'page';
  /** Sheet 开合：仅控制是否拉取 latest，不阻断 run/apply */
  active?: boolean;
  onNavigateToSchedule?: (
    detail: import('@/lib/plan-studio-schedule-navigation').PlanStudioScheduleNavigateDetail,
  ) => void;
  onApplied?: () => void;
  className?: string;
}

export function ReadinessRepairLoopWorkspace({
  tripId,
  initialIssueId,
  variant = 'sheet',
  active = true,
  onNavigateToSchedule,
  onApplied,
  className,
}: ReadinessRepairLoopWorkspaceProps) {
  const featureOn = isTripLoopReadinessEnabled();
  const loop = useReadinessRepairLoop(tripId, {
    enabled: featureOn,
    autoRestore: active,
    onApplied,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailMode, setDetailMode] = useState(Boolean(initialIssueId));
  const [profilingOpen, setProfilingOpen] = useState(false);
  const [profilingSurface, setProfilingSurface] = useState<DecisionProfilingSurface | null>(null);

  useEffect(() => {
    if (searchParams.get('openDecisionProfiling') !== '1') return;
    const surface = (searchParams.get('decisionProfilingSurface') ??
      'hub') as DecisionProfilingSurface;
    setProfilingSurface(surface);
    setProfilingOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('openDecisionProfiling');
    next.delete('decisionProfilingSurface');
    next.delete('decisionProfilingStep');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{
        tripId?: string;
        surface?: DecisionProfilingSurface;
      }>).detail;
      if (detail?.tripId !== tripId) return;
      setProfilingSurface(detail.surface ?? 'hub');
      setProfilingOpen(true);
    };
    window.addEventListener('plan-studio:open-decision-profiling', handler);
    return () => window.removeEventListener('plan-studio:open-decision-profiling', handler);
  }, [tripId]);

  const handleChecklistItemActivate = (item: TripLoopChecklistItem) => {
    const target = resolveLoopChecklistNavigateTarget(item);
    if (target.kind === 'info_only') {
      toast.message(target.message ?? '稍后复查', { duration: 3500 });
      return;
    }
    if (target.kind === 'open_profiling') {
      setProfilingSurface(target.profilingSurface ?? 'hub');
      setProfilingOpen(true);
      if (variant === 'page') {
        notifyFeasibilityIssueFocus(tripId, { category: target.category ?? 'team_fit' });
      }
      return;
    }
    if (target.kind === 'filter_issues' && target.category) {
      if (variant === 'sheet') setDetailMode(true);
      notifyFeasibilityIssueFocus(tripId, { category: target.category });
    }
  };

  const handleApply = async () => {
    const res = await loop.apply();
    if (!res) return;
    notifyFeasibilityReportReload(tripId);
    if (!loop.error) {
      toast.success('已采用推荐调整');
      notifyLoopReadinessChanged(tripId);
      onApplied?.();
    }
  };

  const handleRun = async () => {
    const result = await loop.run({ forceRefreshEvidence: true, runMonteCarlo: true });
    if (result) {
      notifyLoopReadinessChanged(tripId);
      notifyFeasibilityReportReload(tripId);
    }
  };

  if (!featureOn) {
    return (
      <FeasibilityReportPanel
        tripId={tripId}
        embedded={variant === 'sheet'}
        className={className}
        initialIssueId={initialIssueId}
        onNavigateToSchedule={onNavigateToSchedule}
      />
    );
  }

  const loopPanel = (
    <ReadinessRepairLoopPanel
      ui={loop.ui}
      loading={loop.loading}
      running={loop.running}
      applying={loop.applying}
      error={loop.error}
      canApply={loop.canApply}
      onRun={() => void handleRun()}
      onApply={() => void handleApply()}
      onRetry={() => {
        loop.clearError();
        void loop.restore();
      }}
      onOpenFeasibilityDetail={
        variant === 'sheet' ? () => setDetailMode(true) : undefined
      }
      onChecklistItemActivate={handleChecklistItemActivate}
    />
  );

  const profilingDialog = (
    <DecisionProfilingHubDialog
      tripId={tripId}
      open={profilingOpen}
      onOpenChange={setProfilingOpen}
      showTrigger={false}
      initialSurface={profilingSurface}
      forceOpenQuiz={profilingSurface === 'quiz'}
      forceReuseProfile={profilingSurface === 'reuse'}
    />
  );

  const detailPanel = (
    <FeasibilityReportPanel
      tripId={tripId}
      embedded
      initialIssueId={initialIssueId}
      onNavigateToSchedule={onNavigateToSchedule}
    />
  );

  if (variant === 'page') {
    return (
      <div className={cn('space-y-6', className)}>
        {profilingDialog}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              验证闭环
            </p>
            {loopPanel}
          </div>
          <div className="lg:col-span-7 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              可执行证明 · 详细报告
            </p>
            {detailPanel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {profilingDialog}
      {detailMode ? (
        <>
          {detailPanel}
          <Button variant="ghost" size="sm" onClick={() => setDetailMode(false)}>
            返回验证闭环
          </Button>
        </>
      ) : (
        loopPanel
      )}
    </div>
  );
}
