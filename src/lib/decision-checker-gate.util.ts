import type { DecisionCheckerOverviewDto } from '@/types/decision-checker';
import type { GateStatus } from '@/lib/gate-status';

/** 决策检查器概览 → 四态裁决（启发式，供 Banner 展示） */
export function resolveDecisionCheckerOverviewGateStatus(
  model: DecisionCheckerOverviewDto,
): GateStatus {
  const hard = model.conflict?.hardCount ?? 0;
  const soft = model.conflict?.softCount ?? 0;
  const severity = model.conflict?.primary?.severity;
  const primaryBlob = [
    model.conflict?.primary?.title,
    model.conflict?.primary?.message,
  ]
    .filter(Boolean)
    .join(' ');

  if (/缓冲偏紧|缓冲不足|时间窗偏紧|buffer/i.test(primaryBlob)) {
    return 'NEED_CONFIRM';
  }

  if (hard > 0 && severity === 'hard') return 'REJECT';
  if (hard > 0) return 'NEED_CONFIRM';
  if (soft > 0 || severity === 'soft') return 'SUGGEST_REPLACE';
  if (model.repairPlan) return 'NEED_CONFIRM';
  return 'ALLOW';
}

export function resolveDecisionCheckerOverviewGateMessage(
  model: DecisionCheckerOverviewDto,
): string | undefined {
  const primary = model.conflict?.primary;
  if (primary?.message) return primary.message;
  if (model.repairPlan?.title) return model.repairPlan.title;
  return undefined;
}
