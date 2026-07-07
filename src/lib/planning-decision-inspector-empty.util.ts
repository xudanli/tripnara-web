import type {
  PlanningDecisionInspector,
  PlanningDecisionInspectorTabEmptyState,
} from '@/dto/frontend-planning-decision-inspector.types';

/** Bundle meta.tabEmptyState.*=true 表示 deferred，有 preview/inspector 切片时不应显示空态 */
export function resolveInspectorTabDeferred(
  tab: keyof PlanningDecisionInspectorTabEmptyState,
  tabEmptyState: PlanningDecisionInspectorTabEmptyState | undefined,
  options: {
    hasPreview?: boolean;
    hasInspectorSlice?: boolean;
    isLoading?: boolean;
    hasSelection?: boolean;
  },
): boolean {
  if (!tabEmptyState?.[tab]) return false;
  if (options.hasPreview || options.hasInspectorSlice) return false;
  if (options.isLoading && options.hasSelection) return false;
  return true;
}

export function inspectorTabEmptyMessage(
  tab: keyof PlanningDecisionInspectorTabEmptyState,
  inspector?: PlanningDecisionInspector | null,
  fallback?: string,
  options?: { hasSelection?: boolean },
): string {
  if (tab === 'causalChain') {
    return fallback ?? '暂无因果链数据。';
  }
  if (tab === 'planDiff') {
    if (options?.hasSelection) {
      return fallback ?? '当前方案暂无可展示的计划差异。';
    }
    return fallback ?? '请先选择方案';
  }
  if (tab === 'memberConsensus') {
    return (
      inspector?.memberConsensus?.assessment?.statusMessage?.trim() ||
      inspector?.memberConsensus?.summaryBar?.trim() ||
      fallback ||
      '选定方案后可查看成员共识。'
    );
  }
  return (
    inspector?.feasibility?.headline?.trim() ||
    inspector?.feasibility?.verdict?.message?.trim() ||
    fallback ||
    '尚未选定具体方案，暂无法评估写入可行性。'
  );
}
