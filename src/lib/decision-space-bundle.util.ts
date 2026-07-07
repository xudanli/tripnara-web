import type {
  DecisionSpaceBundleIncludeField,
  DecisionSpaceBundleSurface,
} from '@/dto/frontend-decision-space-bundle.types';

/** Phase 1：bundle 可用时 Tier-2 合并读，失败回退独立 GET */
export function isDecisionSpaceBundleEnabled(): boolean {
  return import.meta.env.VITE_DECISION_SPACE_BUNDLE === '1';
}

/** Tier-2 首包排除 basis，中栏方案卡先渲染，依据区 delta / decision-basis 异步补全 */
export const DECISION_SPACE_BUNDLE_TIER2_EXCLUDE: DecisionSpaceBundleIncludeField[] = ['basis'];

/** 选中方案后内联 preview/planDiff；未选时 default 首包 */
export function resolveDecisionSpaceBundleSurface(
  optionId?: string | null,
): DecisionSpaceBundleSurface {
  return optionId?.trim() ? 'inspector' : 'default';
}

export const decisionSpaceBundleQueryKeys = {
  all: ['decision-space-bundle'] as const,
  tier2: (
    tripId: string,
    params: {
      problemId?: string | null;
      proposalId?: string | null;
      conflictId?: string | null;
      optionId?: string | null;
      surface?: string;
    },
  ) =>
    [
      ...decisionSpaceBundleQueryKeys.all,
      'tier2',
      tripId,
      params.problemId ?? '',
      params.proposalId ?? '',
      params.conflictId ?? '',
      params.optionId ?? '',
      params.surface ?? 'default',
    ] as const,
  delta: (
    tripId: string,
    params: {
      problemId: string;
      include: string;
      optionId?: string | null;
    },
  ) =>
    [
      ...decisionSpaceBundleQueryKeys.all,
      'delta',
      tripId,
      params.problemId,
      params.include,
      params.optionId ?? '',
    ] as const,
};

/** Tab 增量 include 掩码 */
export const DECISION_SPACE_INSPECTOR_TAB_INCLUDES: Record<
  'plan_diff' | 'feasibility' | 'members' | 'causal',
  DecisionSpaceBundleIncludeField[]
> = {
  plan_diff: ['inspector.planDiff'],
  feasibility: ['inspector.feasibility'],
  members: ['inspector.memberConsensus'],
  causal: ['inspector.causalChain'],
};

export function inspectorTabIncludeMask(
  tab: 'plan_diff' | 'feasibility' | 'members' | 'causal',
): DecisionSpaceBundleIncludeField[] {
  return DECISION_SPACE_INSPECTOR_TAB_INCLUDES[tab];
}
