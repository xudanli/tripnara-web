import type { NegotiationDecision, TeamNegotiationResponse } from '@/types/optimization-v2';

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function mapDecision(decision: unknown): NegotiationDecision {
  switch (decision) {
    case 'APPROVE':
      return 'APPROVE';
    case 'REJECT':
      return 'REJECT';
    case 'CONDITIONAL_APPROVE':
      return 'APPROVE_WITH_CONDITIONS';
    case 'SPLIT_REQUIRED':
    case 'REQUIRES_DISCUSSION':
      return 'NEEDS_HUMAN';
    case 'APPROVE_WITH_CONDITIONS':
    case 'NEEDS_HUMAN':
      return decision;
    default:
      return 'NEEDS_HUMAN';
  }
}

function normalizeMemberEvaluations(
  raw: unknown
): TeamNegotiationResponse['memberEvaluations'] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const member = item as Record<string, unknown>;
    return {
      userId: String(member.userId ?? member.memberId ?? ''),
      displayName: String(member.displayName ?? member.memberName ?? '成员'),
      utility: coerceNumber(member.utility ?? member.personalUtility, 0),
      concerns: Array.isArray(member.concerns) ? member.concerns.map(String) : [],
    };
  });
}

function normalizeConflicts(raw: unknown): TeamNegotiationResponse['conflicts'] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const conflict = item as Record<string, unknown>;
    const resolutions = Array.isArray(conflict.possibleResolutions)
      ? conflict.possibleResolutions
      : [];
    const firstResolution = resolutions[0] as Record<string, unknown> | undefined;
    const suggestedResolution =
      typeof conflict.suggestedResolution === 'string'
        ? conflict.suggestedResolution
        : typeof firstResolution?.description === 'string'
          ? firstResolution.description
          : undefined;

    const members = Array.isArray(conflict.members)
      ? conflict.members.map(String)
      : Array.isArray(conflict.involvedMembers)
        ? conflict.involvedMembers.map(String)
        : [];

    return {
      type: String(conflict.type ?? 'UNKNOWN'),
      members,
      description: String(conflict.description ?? ''),
      suggestedResolution,
    };
  });
}

function deriveTeamConstraintsSatisfied(raw: Record<string, unknown>): boolean {
  if (typeof raw.teamConstraintsSatisfied === 'boolean') {
    return raw.teamConstraintsSatisfied;
  }

  const conflicts = Array.isArray(raw.conflicts) ? raw.conflicts : [];
  const hasBlockingConflict = conflicts.some((item) => {
    const conflict = item as Record<string, unknown>;
    return (
      conflict.type === 'CONSTRAINT_VIOLATION' ||
      conflict.severity === 'CRITICAL'
    );
  });

  return !hasBlockingConflict;
}

function normalizeStringList(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.map(String).map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function normalizeEvaluationSummary(
  raw: Record<string, unknown>,
): TeamNegotiationResponse['evaluationSummary'] {
  const summary =
    (raw.evaluationSummary as Record<string, unknown> | undefined) ??
    (raw.evaluation_summary as Record<string, unknown> | undefined);
  if (!summary || typeof summary !== 'object') return undefined;
  const concerns = normalizeStringList(
    summary.criticalConcerns ?? summary.critical_concerns,
  );
  if (!concerns?.length) return undefined;
  return { criticalConcerns: concerns };
}

/** 将后端 TeamNegotiationResult 归一化为前端 TeamNegotiationResponse */
export function normalizeTeamNegotiationResponse(raw: unknown): TeamNegotiationResponse {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  return {
    decision: mapDecision(data.decision),
    consensusLevel: coerceNumber(data.consensusLevel, 0),
    hardConstraintBlocked:
      typeof data.hardConstraintBlocked === 'boolean'
        ? data.hardConstraintBlocked
        : typeof data.hard_constraint_blocked === 'boolean'
          ? data.hard_constraint_blocked
          : undefined,
    evaluationSummary: normalizeEvaluationSummary(data),
    humanDecisionPointsFlat: normalizeStringList(
      data.humanDecisionPointsFlat ?? data.human_decision_points_flat,
    ),
    memberEvaluations: normalizeMemberEvaluations(data.memberEvaluations),
    conflicts: normalizeConflicts(data.conflicts),
    teamConstraintsSatisfied: deriveTeamConstraintsSatisfied(data),
  };
}
