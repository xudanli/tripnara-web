import { isConstraintWritebackChain, resolveSummaryWriteChain } from '@/lib/decision-write-chain.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/types/planning-conflicts';

export type DecisionCheckerVisibilityProblem = Pick<
  DecisionProblemSummary,
  'id' | 'semanticKey' | 'decisionCase' | 'writeChain' | 'actionability'
>;

/**
 * 选型 / 约束写回类 DecisionCase：中栏选型即可，不需要决策检查器
 *（车型、保险、冰川、落地、环岛、F-road 升级等）
 */
export function isConstraintSelectDecisionProblem(
  problem?: DecisionCheckerVisibilityProblem | null,
): boolean {
  if (!problem) return false;

  const writeChain = resolveSummaryWriteChain(problem);
  if (isConstraintWritebackChain(writeChain)) return true;

  const sourceKind = String(problem.decisionCase?.sourceKind ?? '').toUpperCase();
  if (sourceKind === 'REQUIRED_CHOICE' || sourceKind === 'OPPORTUNITY') return true;

  const actionKind = String(problem.decisionCase?.actionKind ?? '').toUpperCase();
  if (actionKind === 'SELECT') return true;

  const blob = `${problem.semanticKey ?? ''} ${problem.id ?? ''}`.toUpperCase();
  if (
    /REQUIRED_CHOICE|OPPORTUNITY\.|DC_INSURANCE|DC_VEHICLE|DC_GLACIER|DC_LANDING|DC_RING|DC_FROAD|RULE_TRIGGER\.(LANDING|RING|FROAD)/.test(
      blob,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * 通行缓冲 / 餐窗 / 天气可执行性等：需要右栏决策检查器（因果链 · 计划差异 · 可执行性）
 */
export function isItineraryConflictCheckerProblem(
  problem?: DecisionCheckerVisibilityProblem | null,
  conflict?: PlanningConflictItem | null,
): boolean {
  if (isConstraintSelectDecisionProblem(problem)) return false;

  const blob = `${problem?.semanticKey ?? ''} ${problem?.id ?? ''} ${conflict?.title ?? ''} ${conflict?.message ?? ''} ${conflict?.studioConflict?.type ?? ''} ${conflict?.issue?.conflictType ?? ''} ${conflict?.issue?.issueKind ?? ''}`.toUpperCase();

  if (
    /BUFFER|TRAVEL_TIME|SAME_DAY_TRAVEL|LUNCH|MEAL|TIME_WINDOW|BOOKING|WEATHER|WIND|FEASIBILITY|EXCESSIVE_DAILY|DAILY_LOAD|通行缓冲|午餐|餐窗|时间窗/.test(
      blob,
    )
  ) {
    return true;
  }

  // 有绑定 conflict 且非选型案 → 默认开检查器
  if (conflict && !isConstraintSelectDecisionProblem(problem)) return true;

  return false;
}

/**
 * 决策空间是否展示右栏「决策检查器」。
 * - 非决策空间（普通工作台）始终展示
 * - 选型 DecisionCase → 隐藏
 * - 冲突 / 可执行类 → 展示
 * - 未知问题默认展示（避免藏掉真冲突）
 */
export function decisionSpaceNeedsDecisionChecker(input: {
  decisionSpaceOpen: boolean;
  problem?: DecisionCheckerVisibilityProblem | null;
  conflict?: PlanningConflictItem | null;
}): boolean {
  if (!input.decisionSpaceOpen) return true;
  if (isConstraintSelectDecisionProblem(input.problem)) return false;
  if (isItineraryConflictCheckerProblem(input.problem, input.conflict)) return true;
  // 无 problem、纯 conflict 进空间 → 开检查器
  if (!input.problem && input.conflict) return true;
  // 未知 published problem：保守展示检查器
  return Boolean(input.problem);
}
