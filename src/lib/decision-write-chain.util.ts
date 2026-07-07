import type { DecisionWriteChain, UnifiedProblemFlow } from '@/types/unified-decision';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';

export function writeChainFromLegacyFlow(flow?: UnifiedProblemFlow | null): DecisionWriteChain {
  return flow === 'CANONICAL_L2' ? 'EVALUATE_AUTHORIZE_EXECUTE' : 'APPLY_AND_POLL';
}

export function legacyFlowFromWriteChain(writeChain: DecisionWriteChain): UnifiedProblemFlow {
  return writeChain === 'EVALUATE_AUTHORIZE_EXECUTE' ? 'CANONICAL_L2' : 'LEGACY_V15';
}

export function resolveDecisionWriteChain(input: {
  actionability?: { writeChain?: DecisionWriteChain | null } | null;
  flow?: UnifiedProblemFlow | null;
  flowKind?: DecisionProblemSummary['flowKind'];
}): DecisionWriteChain {
  const chain = input.actionability?.writeChain;
  if (chain === 'EVALUATE_AUTHORIZE_EXECUTE' || chain === 'APPLY_AND_POLL') {
    return chain;
  }
  return writeChainFromLegacyFlow(input.flow ?? input.flowKind ?? null);
}

export function isEvaluateAuthorizeExecuteChain(
  chain: DecisionWriteChain,
): chain is 'EVALUATE_AUTHORIZE_EXECUTE' {
  return chain === 'EVALUATE_AUTHORIZE_EXECUTE';
}

export function isApplyAndPollChain(chain: DecisionWriteChain): chain is 'APPLY_AND_POLL' {
  return chain === 'APPLY_AND_POLL';
}

export function resolveDetailWriteChain(
  detail: Pick<GatewayDecisionProblemDetailResult, 'actionability' | 'flow' | 'flowKind'> | null | undefined,
): DecisionWriteChain {
  if (!detail) return 'APPLY_AND_POLL';
  return resolveDecisionWriteChain(detail);
}

export function resolveSummaryWriteChain(
  summary: Pick<DecisionProblemSummary, 'actionability' | 'flowKind' | 'writeChain'> | null | undefined,
): DecisionWriteChain {
  if (!summary) return 'APPLY_AND_POLL';
  if (summary.writeChain) return summary.writeChain;
  return resolveDecisionWriteChain({
    actionability: summary.actionability,
    flowKind: summary.flowKind,
  });
}
