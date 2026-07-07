import { formatEvidenceFreshness } from '@/lib/decision-problem-display.util';
import type { DecisionContextFact } from '@/lib/decision-context-capsule.util';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { FeasibilityProofAtomDto } from '@/types/trip-feasibility-report';

function proofAtomToMetric(proof: FeasibilityProofAtomDto, index: number): DecisionContextFact | null {
  const label = proof.entity?.trim() || proof.constraint?.trim();
  const text =
    proof.currentFact?.trim() ||
    proof.conclusion?.trim() ||
    proof.constraint?.trim();
  if (!label || !text || label === text) return null;

  const source = proof.evidenceSource?.toLowerCase() ?? '';
  const kind: DecisionContextFact['kind'] =
    source.includes('predict') || source.includes('forecast') || source.includes('model')
      ? 'predicted'
      : 'confirmed';

  return { id: `conflict-proof-${index}`, label, text, kind };
}

/** 从 planning-conflicts issue.proofs 提取决策依据指标卡 */
export function buildDecisionContextMetricsFromConflict(
  conflict?: PlanningConflictItem | null,
): DecisionContextFact[] {
  if (!conflict) return [];

  const facts: DecisionContextFact[] = [];
  const seen = new Set<string>();

  for (const [index, proof] of (conflict.issue?.proofs ?? []).entries()) {
    const fact = proofAtomToMetric(proof, index);
    if (!fact) continue;
    const key = `${fact.label}:${fact.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push(fact);
  }

  const validUntil = conflict.issue?.proofs
    ?.map((proof) => proof.validUntil)
    .find(Boolean);
  if (validUntil) {
    const label = formatEvidenceFreshness(validUntil);
    if (label) {
      facts.push({
        id: 'conflict-valid-until',
        label: '数据有效期',
        text: label,
        kind: 'confirmed',
      });
    }
  }

  if (facts.length === 0 && conflict.message?.trim()) {
    facts.push({
      id: 'conflict-message',
      text: conflict.message.trim(),
      kind: 'confirmed',
    });
  }

  return facts.slice(0, 8);
}
