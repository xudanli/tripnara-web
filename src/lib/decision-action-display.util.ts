import type { DecisionAction } from '@/generated/unified-decision-contracts';
import type { DecisionResolutionCtaPhase } from '@/lib/decision-resolution.util';
import { findDecisionActionForSelection } from '@/lib/decision-action.util';

/** 用户可见的行动标题（不含内部 token） */
export function decisionActionDisplayTitle(
  action: Pick<DecisionAction, 'title' | 'label'>,
): string {
  const title = action.title?.trim() || action.label?.trim();
  return title || '所选方案';
}

/** 底栏主 CTA · 「确认：去官网预订」 */
export function decisionActionConfirmLabel(
  action: Pick<DecisionAction, 'title' | 'label'>,
): string {
  const title = decisionActionDisplayTitle(action);
  const short = title.length > 22 ? `${title.slice(0, 20)}…` : title;
  return `确认：${short}`;
}

/** 折叠区摘要 · 系统已尝试的不可用方案 */
export function formatSuppressedActionsSummary(
  suppressed: DecisionAction[],
): string {
  if (!suppressed.length) return '';
  if (suppressed.length === 1) {
    const reason = suppressed[0]?.blockedReason?.trim();
    return reason || '系统无法在当前条件下自动处理';
  }
  return `系统已检查 ${suppressed.length} 条自动方案，均无法在当前条件下执行`;
}

export type DecisionResolutionStepId = 'select' | 'confirm' | 'apply';

export function resolveDecisionResolutionActiveStep(
  phase: DecisionResolutionCtaPhase,
): DecisionResolutionStepId {
  if (phase === 'done') return 'apply';
  if (phase === 'apply') return 'apply';
  return 'select';
}

/** apply 成功态展示：优先已选 action，回退 resolution.selectedActionId / 缓存标题 */
export function resolveAppliedDecisionActionLabel(input: {
  selectedAction?: DecisionAction | null;
  actions?: DecisionAction[];
  resolutionSelectedActionId?: string | null;
  cachedTitle?: string | null;
}): string | null {
  if (input.cachedTitle?.trim()) return input.cachedTitle.trim();
  if (input.selectedAction) return decisionActionDisplayTitle(input.selectedAction);
  const fromList = findDecisionActionForSelection(
    input.actions ?? [],
    input.resolutionSelectedActionId,
  );
  if (fromList) return decisionActionDisplayTitle(fromList);
  return null;
}
