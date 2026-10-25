import type { DecisionAction } from '@/types/unified-decision';

export interface PartitionedDecisionActions {
  /** 默认 UI 仅展示 allowed === true；DecisionCase 可保留灰卡 */
  visible: DecisionAction[];
  /** includeDebug=1 或后端 debug.suppressedActions */
  suppressed: DecisionAction[];
}

export interface PartitionDecisionActionsOptions {
  /**
   * DecisionCase / CONSTRAINT_WRITEBACK：Eligibility 过滤的 option 需灰显在主列表，
   * 不要丢进「已隐藏」折叠。
   */
  retainDisallowedInVisible?: boolean;
}

/** 默认 UI：不渲染灰卡（allowed === false） */
export function partitionDecisionActionsForUi(
  actions: DecisionAction[] | undefined | null,
  options?: PartitionDecisionActionsOptions,
): PartitionedDecisionActions {
  if (!actions?.length) return { visible: [], suppressed: [] };
  if (options?.retainDisallowedInVisible) {
    return { visible: [...actions], suppressed: [] };
  }
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
