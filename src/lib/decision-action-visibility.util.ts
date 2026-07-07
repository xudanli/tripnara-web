import type { DecisionAction } from '@/types/unified-decision';

export interface PartitionedDecisionActions {
  /** 默认 UI 仅展示 allowed === true */
  visible: DecisionAction[];
  /** includeDebug=1 或后端 debug.suppressedActions */
  suppressed: DecisionAction[];
}

/** 默认 UI：不渲染灰卡（allowed === false） */
export function partitionDecisionActionsForUi(
  actions: DecisionAction[] | undefined | null,
): PartitionedDecisionActions {
  if (!actions?.length) return { visible: [], suppressed: [] };
  const visible: DecisionAction[] = [];
  const suppressed: DecisionAction[] = [];
  for (const action of actions) {
    if (action.allowed === false) suppressed.push(action);
    else visible.push(action);
  }
  return { visible, suppressed };
}

export function filterUiDecisionActions(
  actions: DecisionAction[] | undefined | null,
): DecisionAction[] {
  return partitionDecisionActionsForUi(actions).visible;
}
