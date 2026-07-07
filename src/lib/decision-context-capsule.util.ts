import { formatEvidenceFreshness } from '@/lib/decision-problem-display.util';
import type {
  DecisionProblemAssertion,
  DecisionProblemDetail,
  DecisionProblemProof,
  DecisionProblemSummary,
} from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { buildDecisionContextMetricsFromConflict } from '@/lib/decision-execution-context.util';

export type DecisionContextFactKind = 'confirmed' | 'predicted' | 'unconfirmed';

export interface DecisionContextFact {
  id: string;
  text: string;
  kind: DecisionContextFactKind;
  /** 指标卡标签（决策依据网格） */
  label?: string;
}

function proofToFact(proof: DecisionProblemProof, index: number): DecisionContextFact | null {
  const label = proof.entity?.trim();
  const text =
    proof.summary?.trim() ||
    proof.currentFact?.trim() ||
    (proof.entity && proof.currentFact
      ? `${proof.entity}：${proof.currentFact}`
      : proof.entity?.trim());
  if (!text) return null;

  const source = proof.evidenceSource?.toLowerCase() ?? '';
  const kind: DecisionContextFactKind =
    source.includes('predict') || source.includes('forecast') || source.includes('model')
      ? 'predicted'
      : source.includes('infer') || source.includes('pending') || source.includes('unconfirmed')
        ? 'unconfirmed'
        : 'confirmed';

  return {
    id: `proof-${index}`,
    label: label && label !== text ? label : undefined,
    text: label && label !== text ? text : text,
    kind,
  };
}

function assertionToFacts(assertion: DecisionProblemAssertion, index: number): DecisionContextFact[] {
  const facts: DecisionContextFact[] = [];
  const message = assertion.message?.trim() || assertion.conclusion?.trim();
  if (message) {
    const kind: DecisionContextFactKind =
      assertion.passed === false
        ? 'confirmed'
        : assertion.nature === 'RISK'
          ? 'predicted'
          : 'confirmed';
    facts.push({ id: `assertion-${index}`, text: message, kind });
  }

  for (const [proofIndex, proof] of (assertion.proofs ?? []).entries()) {
    const fact = proofToFact(proof, proofIndex);
    if (fact) facts.push({ ...fact, id: `assertion-${index}-proof-${proofIndex}` });
  }
  return facts;
}

/** 从 problem detail 提取决策上下文胶囊事实（最小切片，非整趟行程） */
export function buildDecisionContextCapsuleFacts(input: {
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  problem?: DecisionProblemSummary | null;
  narrative?: string | null;
  conflict?: PlanningConflictItem | null;
}): DecisionContextFact[] {
  const facts: DecisionContextFact[] = [];
  const seen = new Set<string>();

  const push = (fact: DecisionContextFact) => {
    const key = `${fact.label ?? ''}:${fact.text.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    facts.push(fact);
  };

  for (const metric of buildDecisionContextMetricsFromConflict(input.conflict)) {
    push(metric);
  }

  for (const [index, assertion] of (input.detail?.assertions ?? []).entries()) {
    for (const fact of assertionToFacts(assertion, index)) push(fact);
  }

  const narrative = input.narrative?.trim();
  if (narrative && facts.length === 0) {
    push({ id: 'narrative', text: narrative, kind: 'confirmed' });
  }

  const scopeSummary = input.detail?.affectedScopeSummary?.trim() ?? input.problem?.affectedScopeSummary?.trim();
  if (scopeSummary) {
    push({ id: 'scope', text: scopeSummary, kind: 'confirmed' });
  }

  const validUntil =
    input.problem?.evidenceValidUntil ??
    input.detail?.assertions
      ?.flatMap((a) => a.proofs ?? [])
      .map((p) => p.validUntil)
      .find(Boolean);

  if (validUntil) {
    const label = formatEvidenceFreshness(validUntil);
    if (label) {
      push({
        id: 'valid-until',
        text: `当前数据有效至 ${label}`,
        kind: 'confirmed',
      });
    }
  }

  return facts.slice(0, 8);
}

export function decisionContextFactKindLabel(kind: DecisionContextFactKind): string {
  if (kind === 'predicted') return '系统预测';
  if (kind === 'unconfirmed') return '尚未确认';
  return '已确认事实';
}
