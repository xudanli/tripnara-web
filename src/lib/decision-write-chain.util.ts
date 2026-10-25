import type { DecisionWriteChain, UnifiedProblemFlow } from '@/types/unified-decision';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';

export function writeChainFromLegacyFlow(flow?: UnifiedProblemFlow | null): DecisionWriteChain {
  return flow === 'CANONICAL_L2' ? 'EVALUATE_AUTHORIZE_EXECUTE' : 'APPLY_AND_POLL';
}

export function legacyFlowFromWriteChain(writeChain: DecisionWriteChain): UnifiedProblemFlow {
  return writeChain === 'EVALUATE_AUTHORIZE_EXECUTE' ? 'CANONICAL_L2' : 'LEGACY_V15';
}

const KNOWN_WRITE_CHAINS = new Set<DecisionWriteChain>([
  'EVALUATE_AUTHORIZE_EXECUTE',
  'APPLY_AND_POLL',
  'CONSTRAINT_WRITEBACK',
]);

export function resolveDecisionWriteChain(input: {
  actionability?: { writeChain?: DecisionWriteChain | null } | null;
  flow?: UnifiedProblemFlow | null;
  flowKind?: DecisionProblemSummary['flowKind'];
}): DecisionWriteChain {
  const chain = input.actionability?.writeChain;
  if (chain && KNOWN_WRITE_CHAINS.has(chain)) {
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

export function isConstraintWritebackChain(
  chain: DecisionWriteChain,
): chain is 'CONSTRAINT_WRITEBACK' {
  return chain === 'CONSTRAINT_WRITEBACK';
}

/** resolve → apply 路径（含 DecisionCase 约束写回） */
export function usesResolveApplyWritePath(chain: DecisionWriteChain): boolean {
  return chain === 'APPLY_AND_POLL' || chain === 'CONSTRAINT_WRITEBACK';
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
