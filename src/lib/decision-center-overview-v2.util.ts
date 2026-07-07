import type { DecisionCenterOverview } from '@/types/decision-problem';
import type { UnifiedDecisionCenterOverviewView } from '@/types/unified-decision';

function resolvedCountFromLegacyByStatus(
  byStatus?: Partial<Record<string, number>> | null,
): number {
  if (!byStatus) return 0;
  return (byStatus.RESOLVED ?? 0) + (byStatus.DISMISSED ?? 0);
}

/** 将 Gateway v2 overview 合并进 L1 DecisionCenterOverview（读路径 SSOT） */
export function mergeDecisionCenterOverviewV2(
  base: DecisionCenterOverview | null | undefined,
  v2?: UnifiedDecisionCenterOverviewView | null,
  fallback?: { problemCount?: number },
): DecisionCenterOverview | null {
  if (!base && !v2) return null;

  const openFromV2 =
    v2?.totalOpenProblemCount ??
    v2?.problemCounts?.open ??
    fallback?.problemCount;

  const legacyByStatus = (
    base?.problemCounts as { byStatus?: Partial<Record<string, number>> } | undefined
  )?.byStatus;
  const resolvedProblemCount =
    v2?.resolvedProblemCount ??
    base?.resolvedProblemCount ??
    resolvedCountFromLegacyByStatus(legacyByStatus);
  const openCount = openFromV2 ?? base?.problemCounts.open ?? 0;
  const totalProblemCount =
    v2?.totalProblemCount ??
    base?.totalProblemCount ??
    (resolvedProblemCount > 0 ? resolvedProblemCount + openCount : undefined);

  return {
    headline: v2?.headline?.trim() || base?.headline || '',
    problemCounts: {
      open: openCount,
      byEnforcement: {
        ...(base?.problemCounts.byEnforcement ?? {}),
        ...(v2?.problemCounts?.byEnforcement ?? {}),
      },
    },
    feasibility: base?.feasibility ?? {
      canStartExecute: openCount === 0,
      mustHandleCount: v2?.blockingProblemCount ?? 0,
    },
    actionableProblemCount: base?.actionableProblemCount ?? 0,
    affectedDayNumbers: base?.affectedDayNumbers,
    affectedMemberIds: base?.affectedMemberIds,
    recentDecisions: base?.recentDecisions,
    blockingProblemCount: v2?.blockingProblemCount,
    occurrenceCount: v2?.occurrenceCount,
    totalOpenProblemCount: v2?.totalOpenProblemCount ?? openFromV2,
    resolvedProblemCount,
    totalProblemCount,
    guardianHeadline: v2?.guardianHeadline?.trim() || base?.guardianHeadline,
    guardianAssessment: v2?.guardianAssessment?.trim() || base?.guardianAssessment,
  };
}
