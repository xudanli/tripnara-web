import { resolveGuardianCausalHeadline } from '@/lib/causal-trace-view.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';

/** 决策空间 · Abu 安全提示 headline（detail / preview / 列表降级） */
export function resolveDecisionSpaceGuardianWarning(input: {
  detail?: unknown;
  preview?: GatewayDecisionPreviewResult | null;
  problem?: DecisionProblemSummary | null;
}): string | undefined {
  return (
    resolveGuardianCausalHeadline(input.detail) ||
    resolveGuardianCausalHeadline(input.preview) ||
    input.problem?.guardianCausalHeadline?.trim() ||
    undefined
  );
}
