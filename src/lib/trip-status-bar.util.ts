import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type {
  DecisionQueueItem,
  DecisionQueueSeverity,
  ExecutabilityStatus,
  TravelStatusResponse,
} from '@/api/travel-status.types';

/** 用户可理解的四级准备状态（§二） */
export type TripReadinessLevel =
  | 'PREPARING'
  | 'MOSTLY_READY'
  | 'READY_TO_GO'
  | 'ACTION_REQUIRED';

export interface TripStatusBarCounts {
  blockers: number;
  needsConfirm: number;
  warnings: number;
  monitoring: number;
}

export interface TripStatusBarViewModel {
  readiness: TripReadinessLevel;
  readinessLabel: string;
  headline: string;
  subheadline?: string;
  counts: TripStatusBarCounts;
  planVersionLabel?: string;
  freshnessLabel?: string;
  worldStateUpdatedLabel?: string;
  topIssues: Array<{ problemId: string; headline: string; impact?: string }>;
}

const READINESS_LABELS: Record<TripReadinessLevel, string> = {
  PREPARING: '准备中',
  MOSTLY_READY: '基本可行',
  READY_TO_GO: '可以出发',
  ACTION_REQUIRED: '需要处理',
};

function countDecisionsBySeverity(
  items: DecisionQueueItem[],
  severities: DecisionQueueSeverity[],
): number {
  return items.filter((i) => severities.includes(i.severity)).length;
}

export function resolveTripStatusBarCounts(
  status: TravelStatusResponse,
  overrides?: Partial<TripStatusBarCounts & { openDecisionCount?: number }>,
): TripStatusBarCounts {
  const items = status.openDecisions ?? [];
  const blockers =
    overrides?.blockers ??
    (countDecisionsBySeverity(items, ['BLOCK']) ||
      (status.executability.status === 'BLOCKED'
        ? Math.max(1, status.executability.issueCount ?? 0)
        : 0));
  const needsConfirm =
    overrides?.needsConfirm ??
    (status.pendingVerification?.items?.length ?? 0) +
      countDecisionsBySeverity(items, ['VERIFY']);
  const warnings =
    overrides?.warnings ??
    countDecisionsBySeverity(items, ['CONFLICT', 'OPTIMIZE']);
  const monitoring =
    overrides?.monitoring ?? status.monitoring?.activeCount ?? 0;

  return { blockers, needsConfirm, warnings, monitoring };
}

export function resolveTripReadinessLevel(
  executability: ExecutabilityStatus,
  counts: TripStatusBarCounts,
): TripReadinessLevel {
  if (counts.blockers > 0 || executability === 'BLOCKED') {
    return 'ACTION_REQUIRED';
  }
  if (executability === 'READY' && counts.needsConfirm === 0 && counts.warnings === 0) {
    return 'READY_TO_GO';
  }
  if (executability === 'READY') {
    return 'MOSTLY_READY';
  }
  if (counts.needsConfirm > 0 && counts.blockers === 0) {
    return 'PREPARING';
  }
  return 'MOSTLY_READY';
}

function formatRelativeTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return undefined;
  return formatDistanceToNow(ms, { addSuffix: true, locale: zhCN });
}

function formatPlanVersion(versionId?: string): string | undefined {
  if (!versionId) return undefined;
  const match = versionId.match(/v?(\d+)/i);
  if (match) return `V${match[1]}`;
  return versionId.length <= 12 ? versionId : `${versionId.slice(0, 8)}…`;
}

export function buildTripStatusBarViewModel(
  status: TravelStatusResponse,
  overrides?: Partial<TripStatusBarCounts & { openDecisionCount?: number }>,
): TripStatusBarViewModel {
  const counts = resolveTripStatusBarCounts(status, overrides);
  const readiness = resolveTripReadinessLevel(status.executability.status, counts);

  const topIssues = (status.openDecisions ?? []).slice(0, 3).map((item) => ({
    problemId: item.problemId,
    headline: item.headline,
    impact: item.impact,
  }));

  const planUpdated = formatRelativeTime(status.effectivePlan?.lastUpdatedAt);
  const snapshotRevision = status.contextSnapshot?.revision;

  return {
    readiness,
    readinessLabel: READINESS_LABELS[readiness],
    headline: status.executability.headline,
    subheadline: status.executability.subheadline,
    counts,
    planVersionLabel: formatPlanVersion(status.effectivePlan?.versionId),
    freshnessLabel: planUpdated ? `计划 ${planUpdated} 更新` : undefined,
    worldStateUpdatedLabel:
      snapshotRevision != null
        ? `世界状态 · rev ${snapshotRevision}${planUpdated ? ` · ${planUpdated}` : ''}`
        : planUpdated
          ? `状态 ${planUpdated} 更新`
          : undefined,
    topIssues,
  };
}

export function tripReadinessToneClass(level: TripReadinessLevel): string {
  switch (level) {
    case 'READY_TO_GO':
      return 'text-gate-allow-foreground bg-gate-allow/15 border-gate-allow-border/40';
    case 'MOSTLY_READY':
      return 'text-gate-suggest-foreground bg-gate-suggest/10 border-gate-suggest-border/35';
    case 'PREPARING':
      return 'text-gate-confirm-foreground bg-gate-confirm/10 border-gate-confirm-border/35';
    case 'ACTION_REQUIRED':
    default:
      return 'text-gate-reject-foreground bg-gate-reject/10 border-gate-reject-border/40';
  }
}
