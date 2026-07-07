import type {
  DecisionCenterOverview,
  DecisionCenterRecentDecisionSnapshot,
  PrimaryEnforcement,
} from '@/types/decision-problem';
import { countPendingAttentionDecisions } from '@/lib/decision-center.util';

/** L1 用户可见总览态（不暴露 Gate / Feasibility 来源） */
export type DecisionCenterOverviewState =
  | 'PASS'
  | 'WARN'
  | 'REQUIRE_CONFIRMATION'
  | 'REQUIRE_ADJUSTMENT'
  | 'BLOCK'
  | 'APPLYING';

export interface DecisionCenterOverviewPresentation {
  state: DecisionCenterOverviewState;
  headline: string;
  blockCount: number;
  confirmationCount: number;
  adjustmentCount: number;
  warnCount: number;
  openCount: number;
  occurrenceCount: number;
  executingCount: number;
  /** v2 resolvedProblemCount */
  resolvedCount: number;
  affectedDayNumbers: number[];
}

const OVERVIEW_STATE_META: Record<
  DecisionCenterOverviewState,
  { headline: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' }
> = {
  PASS: { headline: '当前行程检查通过', tone: 'success' },
  WARN: { headline: '有风险需要留意', tone: 'warning' },
  REQUIRE_CONFIRMATION: { headline: '有决定等待确认', tone: 'info' },
  REQUIRE_ADJUSTMENT: { headline: '行程需要调整', tone: 'warning' },
  BLOCK: { headline: '当前行程不可执行', tone: 'danger' },
  APPLYING: { headline: '正在重新检查行程', tone: 'muted' },
};

function enforcementCount(
  byEnforcement: Partial<Record<PrimaryEnforcement, number>> | undefined,
  key: PrimaryEnforcement,
): number {
  return byEnforcement?.[key] ?? 0;
}

function hasApplyingExecution(
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null,
): boolean {
  if (!recentDecisions?.length) return false;
  return recentDecisions.some(
    (d) => String(d.executionStatus ?? '').trim().toUpperCase() === 'APPLYING',
  );
}

/** 从 overview 推导 L1 展示态（优先执行中 > 阻断 > 调整 > 确认 > 风险 > 通过） */
export function resolveDecisionCenterOverviewPresentation(
  overview: DecisionCenterOverview,
  openCount?: number,
): DecisionCenterOverviewPresentation {
  const byEnforcement = overview.problemCounts.byEnforcement ?? {};
  const blockCount =
    overview.blockingProblemCount ?? enforcementCount(byEnforcement, 'BLOCK');
  const adjustmentCount = enforcementCount(byEnforcement, 'REQUIRE_ADJUSTMENT');
  const confirmationCount = enforcementCount(byEnforcement, 'REQUIRE_CONFIRMATION');
  const warnCount =
    enforcementCount(byEnforcement, 'WARN') + enforcementCount(byEnforcement, 'INFORM');
  const open =
    openCount ??
    overview.totalOpenProblemCount ??
    overview.problemCounts.open ??
    0;
  const occurrenceCount = overview.occurrenceCount ?? open;
  const executingCount = countPendingAttentionDecisions(overview.recentDecisions);
  const resolvedCount = overview.resolvedProblemCount ?? 0;
  const affectedDayNumbers = overview.affectedDayNumbers ?? [];

  let state: DecisionCenterOverviewState;

  if (hasApplyingExecution(overview.recentDecisions)) {
    state = 'APPLYING';
  } else if (open === 0 && overview.feasibility.canStartExecute && blockCount === 0) {
    state = 'PASS';
  } else if (blockCount > 0) {
    state = 'BLOCK';
  } else if (adjustmentCount > 0) {
    state = 'REQUIRE_ADJUSTMENT';
  } else if (confirmationCount > 0) {
    state = 'REQUIRE_CONFIRMATION';
  } else if (warnCount > 0 || open > 0) {
    state = 'WARN';
  } else {
    state = 'PASS';
  }

  const headline =
    overview.headline?.trim() && state !== 'PASS'
      ? overview.headline.trim()
      : OVERVIEW_STATE_META[state].headline;

  return {
    state,
    headline,
    blockCount,
    confirmationCount,
    adjustmentCount,
    warnCount,
    openCount: open,
    occurrenceCount,
    executingCount,
    resolvedCount,
    affectedDayNumbers,
  };
}

export function decisionCenterOverviewTone(
  state: DecisionCenterOverviewState,
): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  return OVERVIEW_STATE_META[state].tone;
}
