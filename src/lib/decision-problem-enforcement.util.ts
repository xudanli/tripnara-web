import type {
  DecisionProblemLegacy,
  DecisionProblemEnforcement,
  PrimaryEnforcement,
} from '@/types/decision-problem';

export function readPrimaryEnforcement(
  problem: Pick<DecisionProblemLegacy, 'assertions'> | null | undefined,
): DecisionProblemEnforcement | undefined {
  return problem?.assertions?.[0]?.enforcement;
}

/** 列表项 primaryEnforcement → 是否阻断态（替代 issue.type === HARD） */
export function isBlockingPrimaryEnforcement(
  enforcement: PrimaryEnforcement | null | undefined,
): boolean {
  return String(enforcement ?? '').trim().toUpperCase() === 'BLOCK';
}

/** 是否硬执行（替代 constraint.type === 'HARD'） */
export function isHardDecisionEnforcement(
  enforcement: DecisionProblemEnforcement | null | undefined,
): boolean {
  if (!enforcement) return false;
  const normalized = String(enforcement).trim().toUpperCase();
  return normalized === 'HARD' || normalized === 'ON' || normalized === 'MUST_HANDLE';
}

export function resolveDecisionProblemId(entity: {
  id: string;
  decisionProblemId?: string;
}): string {
  return entity.decisionProblemId ?? entity.id;
}
