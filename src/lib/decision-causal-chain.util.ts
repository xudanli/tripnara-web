import type { DecisionCheckerEvidenceDto } from '@/types/decision-checker';
import type {
  DecisionProblemAssertion,
  DecisionProblemDetail,
} from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';

export interface DecisionCausalChainStep {
  id: string;
  text: string;
}

function stepsFromAssertions(assertions: DecisionProblemAssertion[] | undefined): DecisionCausalChainStep[] {
  const steps: DecisionCausalChainStep[] = [];
  for (const [index, assertion] of (assertions ?? []).entries()) {
    const text = assertion.message?.trim() || assertion.conclusion?.trim();
    if (text) {
      steps.push({ id: `assertion-${index}`, text });
      continue;
    }
    for (const [proofIndex, proof] of (assertion.proofs ?? []).entries()) {
      const proofText = proof.summary?.trim() || proof.currentFact?.trim();
      if (proofText) {
        steps.push({ id: `assertion-${index}-proof-${proofIndex}`, text: proofText });
      }
    }
  }
  return steps;
}

function stepsFromEvidence(evidence: DecisionCheckerEvidenceDto | undefined): DecisionCausalChainStep[] {
  const items = evidence?.items ?? [];
  return items
    .map((item, index) => {
      const text = item.summary?.trim() || item.title?.trim() || item.detail?.trim();
      return text ? { id: `evidence-${index}`, text } : null;
    })
    .filter((step): step is DecisionCausalChainStep => step != null)
    .slice(0, 6);
}

/** 构建因果链步骤（优先 assertions，回退 evidence） */
export function buildDecisionCausalChain(input: {
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  evidence?: DecisionCheckerEvidenceDto;
  narrative?: string | null;
}): DecisionCausalChainStep[] {
  const fromAssertions = stepsFromAssertions(input.detail?.assertions);
  if (fromAssertions.length >= 2) return fromAssertions.slice(0, 6);

  const fromEvidence = stepsFromEvidence(input.evidence);
  if (fromEvidence.length >= 2) return fromEvidence;

  const narrative = input.narrative?.trim();
  if (narrative) {
    const parts = narrative
      .split(/[。；;]\s*/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 4);
    if (parts.length >= 2) {
      return parts.slice(0, 6).map((text, index) => ({ id: `narrative-${index}`, text }));
    }
    return [{ id: 'narrative', text: narrative }];
  }

  return fromAssertions.length ? fromAssertions : fromEvidence;
}
