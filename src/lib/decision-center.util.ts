import type {
  DecisionCenterOverview,
  DecisionCenterRecentDecisionSnapshot,
  DecisionProblemSummary,
  ExecutionCapability,
} from '@/types/decision-problem';
import { isDecisionPendingAttention } from '@/generated/decision-semantics-contracts';

const CLOSED_STATUSES = new Set(['RESOLVED', 'DISMISSED']);

export function isOpenDecisionProblem(
  item: Pick<DecisionProblemSummary, 'status'>,
): boolean {
  return !CLOSED_STATUSES.has(String(item.status ?? '').toUpperCase());
}

/** L2：problemResolution 未回写 + 存在 pending execution → 保持 OPEN */
export function isProblemAwaitingExecutionResolution(
  item: DecisionProblemSummary,
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null,
): boolean {
  if (isOpenDecisionProblem(item)) return true;

  const pendingDecision = recentDecisions?.find(
    (d) =>
      d.problemId === item.id &&
      isDecisionPendingAttention(d.executionStatus, d.needsRepair),
  );
  if (!pendingDecision) return false;

  if (item.resolvedByDecisionId && item.resolutionKind) {
    return isDecisionPendingAttention(pendingDecision.executionStatus, pendingDecision.needsRepair);
  }

  return isDecisionPendingAttention(pendingDecision.executionStatus, pendingDecision.needsRepair);
}

export function partitionDecisionProblems(
  items: DecisionProblemSummary[],
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null,
): {
  open: DecisionProblemSummary[];
  resolved: DecisionProblemSummary[];
} {
  const open: DecisionProblemSummary[] = [];
  const resolved: DecisionProblemSummary[] = [];
  for (const item of items) {
    if (isProblemAwaitingExecutionResolution(item, recentDecisions)) open.push(item);
    else resolved.push(item);
  }
  return { open, resolved };
}

export function countOpenDecisionProblems(
  items: DecisionProblemSummary[],
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null,
): number {
  return items.filter((item) => isProblemAwaitingExecutionResolution(item, recentDecisions)).length;
}

/** L1：recentDecisions 中需用户关注的执行态计数 */
export function countPendingAttentionDecisions(
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null,
): number {
  if (!recentDecisions?.length) return 0;
  return recentDecisions.filter((d) =>
    isDecisionPendingAttention(d.executionStatus, d.needsRepair),
  ).length;
}

/** BFF 可能回 `decisionId`；L1/L2 链接与条带统一用此解析 */
export function recentDecisionSnapshotId(
  d: Pick<DecisionCenterRecentDecisionSnapshot, 'id' | 'decisionId'>,
): string {
  return d.id || d.decisionId || '';
}

export function hasDirectExecutionOption(
  options: Array<{ executionCapability?: ExecutionCapability }>,
): boolean {
  return options.some((o) => o.executionCapability?.toUpperCase() === 'DIRECT');
}

export function formatDecisionCenterHeadline(
  overview: DecisionCenterOverview | null | undefined,
  openCount?: number,
): string {
  if (overview?.headline?.trim()) return overview.headline.trim();
  const count = openCount ?? overview?.problemCounts.open ?? 0;
  if (count <= 0) return '暂无待决策问题';
  return `有 ${count} 项待决策问题`;
}
