import type { DecisionsViewData } from '@/travel-context/views/travel-context-views.types';

/** P0.3 — Travel Context openDecisions 优先，BFF 兜底 */
export function resolveUnifiedOpenDecisionCount(input: {
  travelContextEnabled: boolean;
  travelContextReady: boolean;
  contextOpenCount: number;
  bffOpenCount: number;
}): number {
  const { travelContextEnabled, travelContextReady, contextOpenCount, bffOpenCount } = input;
  if (travelContextEnabled && travelContextReady && contextOpenCount >= 0) {
    return contextOpenCount;
  }
  return bffOpenCount;
}

export function resolveUnifiedMonitoringCount(input: {
  travelContextEnabled: boolean;
  travelContextReady: boolean;
  contextMonitoringCount: number;
  bffMonitoringCount: number;
}): number {
  const { travelContextEnabled, travelContextReady, contextMonitoringCount, bffMonitoringCount } =
    input;
  if (travelContextEnabled && travelContextReady && contextMonitoringCount >= 0) {
    return contextMonitoringCount;
  }
  return bffMonitoringCount;
}

/** decisions view → 与 BFF DecisionQueueItem 最小兼容的摘要（仅计数/空态用） */
export function countOpenDecisionsFromView(view?: DecisionsViewData): number {
  if (!view) return 0;
  if (typeof view.openDecisionCount === 'number') return view.openDecisionCount;
  const problems = view.problems ?? [];
  return problems.filter((p) => p.status !== 'COMPLETED' && p.status !== 'RESOLVED').length;
}
