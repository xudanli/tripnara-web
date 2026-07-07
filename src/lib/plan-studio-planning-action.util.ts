/** 规划待办 / 决策入口路由（PM：工作台 vs 行前准备） */

export type PlanningActionContext = 'workbench' | 'pre_departure';

export type PlanningActionTarget = 'decision_space' | 'planning_inbox';

/**
 * 工作台：BFF 有待决 decision-problem → 决策空间（左队列 + 中栏对比）
 * 行前准备 / 无 BFF / 无 open problem → Tasks 规划待办收件箱
 */
export function resolvePlanningActionTarget(input: {
  useDecisionProblemsBff: boolean;
  openDecisionProblemCount: number;
  context: PlanningActionContext;
}): PlanningActionTarget {
  if (input.context === 'pre_departure') return 'planning_inbox';
  if (input.useDecisionProblemsBff && input.openDecisionProblemCount > 0) {
    return 'decision_space';
  }
  return 'planning_inbox';
}

/** 通用 CTA 文案；场景化 label（如「处理准入阻塞」）原样保留 */
export function resolvePlanningActionCtaLabel(input: {
  target: PlanningActionTarget;
  context: PlanningActionContext;
  /** 来自 planning-readiness 的原始 label */
  specificLabel?: string;
}): string {
  const specific = input.specificLabel?.trim();
  if (specific && specific !== '查看规划待办') return specific;
  if (input.target === 'decision_space') return '去决策';
  return '查看规划待办';
}
