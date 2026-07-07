/** Consumer Exploration 流程步骤 — 对齐 frontend-routes-scaffold §2 */

export const EXPLORE_FLOW_STEPS = [
  { id: 'conditions', label: '旅行条件' },
  { id: 'principles', label: '旅行原则' },
  { id: 'routes', label: '路线方向' },
  { id: 'compare', label: '路线比较' },
  { id: 'detail', label: '路线详情' },
  { id: 'decision', label: '风险与修复' },
  { id: 'continue', label: '继续探索' },
] as const;

export type ExploreFlowStepId = (typeof EXPLORE_FLOW_STEPS)[number]['id'];

/** @deprecated 旧步骤 id 映射到新 stepper */
export const LEGACY_STEP_MAP: Record<string, ExploreFlowStepId> = {
  conditions: 'conditions',
  principles: 'principles',
  style: 'routes',
  routes: 'routes',
  compare: 'compare',
  detail: 'detail',
  check: 'decision',
  issues: 'decision',
  risk: 'decision',
  decision: 'decision',
  continue: 'continue',
};

export function exploreStepIndex(stepId: ExploreFlowStepId | string): number {
  const mapped = LEGACY_STEP_MAP[stepId] ?? stepId;
  return EXPLORE_FLOW_STEPS.findIndex((s) => s.id === mapped);
}

export function exploreBasePath(scenarioId: string): string {
  return `/dashboard/explore/${scenarioId}`;
}
