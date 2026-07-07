import type {
  DecisionCenterOverview,
  DecisionProblemSummary,
} from '@/types/decision-problem';
import type { UnifiedDecisionProblemListMeta } from '@/types/unified-decision';
import { formatDecisionCenterHeadline } from '@/lib/decision-center.util';
import { formatDecisionQueueMergeSummary } from '@/lib/decision-queue-cluster.util';

export interface DecisionListBadgeInput {
  actionableCount?: number;
  openCount?: number;
}

/** v2 角标：actionableCount 优先，其次 openCount */
export function resolveDecisionListBadgeCount(
  meta: DecisionListBadgeInput | null | undefined,
  fallbackCount = 0,
): number {
  if (meta?.actionableCount != null && meta.actionableCount > 0) {
    return meta.actionableCount;
  }
  if (meta?.openCount != null) return meta.openCount;
  return fallbackCount;
}

export function formatDecisionListBadgeLabel(
  meta: DecisionListBadgeInput | null | undefined,
  fallbackCount = 0,
): string {
  const actionable = meta?.actionableCount ?? 0;
  const open = meta?.openCount ?? fallbackCount;

  if (actionable > 0) return `${actionable} 待决策`;
  if (open > 0) return `${open} 待处理`;
  return '';
}

export function pickListMetaForBadge(
  meta: UnifiedDecisionProblemListMeta | null | undefined,
): DecisionListBadgeInput {
  return {
    actionableCount: meta?.actionableCount,
    openCount: meta?.openCount,
  };
}

/** 队列进度 · 「2/17 已处理」 */
export function formatDecisionQueueProgressLabel(input: {
  openCount: number;
  resolvedCount: number;
}): string {
  const total = input.openCount + input.resolvedCount;
  if (total <= 0) return '';
  return `${input.resolvedCount}/${total} 已处理`;
}

export function resolveDecisionQueueProgressRatio(input: {
  openCount: number;
  resolvedCount: number;
}): number {
  const total = input.openCount + input.resolvedCount;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, input.resolvedCount / total));
}

/** 队列角标 · 「3 阻断 · 12 需调整」 */
export function formatDecisionQueueEnforcementBadgeLabel(
  openItems: DecisionProblemSummary[],
): string {
  if (!openItems.length) return '';

  let block = 0;
  let adjustment = 0;
  for (const item of openItems) {
    const enforcement = String(item.primaryEnforcement ?? '').trim().toUpperCase();
    if (enforcement === 'BLOCK') block += 1;
    else if (enforcement === 'REQUIRE_ADJUSTMENT') adjustment += 1;
  }

  const parts: string[] = [];
  if (block > 0) parts.push(`${block} 阻断`);
  if (adjustment > 0) parts.push(`${adjustment} 需调整`);

  if (parts.length > 0) return parts.join(' · ');
  return `${openItems.length} 待决`;
}

/**
 * 左栏决策队列标题：与可见 open 条数一致。
 * 当 overview.occurrenceCount > 可见条数时，说明诊断合并关系。
 */
export function formatWorkbenchDecisionQueueHeadline(
  openProblems: DecisionProblemSummary[],
  overview?: DecisionCenterOverview | null,
  /** decision-problems meta — occurrenceCount 为 feasibility 原始诊断数 */
  listMeta?: { occurrenceCount?: number; openCount?: number } | null,
): string | null {
  const openCount = openProblems.length;
  if (openCount <= 0) return null;

  const diagnosticCount = listMeta?.occurrenceCount ?? overview?.occurrenceCount;
  if (typeof diagnosticCount === 'number' && diagnosticCount > openCount) {
    const mergeSummary = formatDecisionQueueMergeSummary({
      diagnosticCount,
      clusterCount: openCount,
    });
    if (mergeSummary) return mergeSummary;
  }

  let block = 0;
  let adjustment = 0;
  for (const item of openProblems) {
    const enforcement = String(item.primaryEnforcement ?? '').trim().toUpperCase();
    if (enforcement === 'BLOCK') block += 1;
    else if (enforcement === 'REQUIRE_ADJUSTMENT') adjustment += 1;
  }

  if (block > 0 && adjustment === 0) {
    return `有 ${block} 项阻断问题需要处理`;
  }
  if (adjustment > 0 && block === 0) {
    return `建议尽快调整行程（${openCount} 项）`;
  }
  if (block > 0 && adjustment > 0) {
    return `有 ${openCount} 项待处理（${block} 阻断 · ${adjustment} 需调整）`;
  }

  return formatDecisionCenterHeadline(overview, openCount);
}
