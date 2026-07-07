import type { OverviewViewData } from '@/travel-context/views/overview-view.types';
import type { PlanViewData } from '@/travel-context/views/travel-context-views.types';
import type { TravelContextStage } from '@/travel-context/domain/travel-context.constants';

export interface ContextStatusDisplay {
  tripStageLabel: string;
  syncLabel: string;
  effectivePlanLabel: string;
  openDecisionsLabel: string | null;
  monitoringLabel: string | null;
  freshnessLabel: string | null;
  consistencyWarning: string | null;
  pendingProposalLabel: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  EXPLORATION: '探索中',
  PLANNING: '规划中',
  EXECUTION: '行中',
  MONITORING: '持续监控',
};

export function resolveTripStageLabel(stage?: TravelContextStage | string): string {
  if (!stage) return '规划中';
  return STAGE_LABELS[stage] ?? '规划中';
}

export function resolveSyncLabel(loading: boolean, error?: string | null): string {
  if (loading) return '正在同步…';
  if (error) return '同步异常';
  return '刚刚已同步';
}

export function buildContextStatusDisplay(input: {
  stage?: TravelContextStage | string;
  loading: boolean;
  error?: string | null;
  overviewView?: OverviewViewData;
  planView?: PlanViewData;
  openDecisionCount: number;
  monitoringCount: number;
}): ContextStatusDisplay {
  const { stage, loading, error, overviewView, planView, openDecisionCount, monitoringCount } =
    input;

  const effectiveHeadline =
    planView?.effectivePlan?.headline ??
    overviewView?.effectivePlanLabel ??
    (planView?.effectivePlan?.versionId ? '当前生效方案' : null);

  return {
    tripStageLabel: overviewView?.stage
      ? resolveTripStageLabel(overviewView.stage)
      : resolveTripStageLabel(stage),
    syncLabel: resolveSyncLabel(loading, error),
    effectivePlanLabel: effectiveHeadline ?? '当前方案已生效',
    openDecisionsLabel:
      openDecisionCount > 0 ? `${openDecisionCount} 项需要确认` : null,
    monitoringLabel:
      monitoringCount > 0 ? `正在关注 ${monitoringCount} 项变化` : null,
    freshnessLabel: overviewView?.dataFreshnessLabel ?? null,
    consistencyWarning: overviewView?.consistencyWarning ?? null,
    pendingProposalLabel:
      overviewView?.pendingProposalCount && overviewView.pendingProposalCount > 0
        ? '有一版调整方案待确认'
        : null,
  };
}
