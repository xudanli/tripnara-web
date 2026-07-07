import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

/** BFF decision-basis 查询用 conflictId（与 GET /conflicts 对齐） */
export function resolvePlanningConflictIdForBasis(
  conflict?: PlanningConflictItem | null,
): string | undefined {
  if (!conflict) return undefined;
  const issueId = conflict.issue?.id?.trim();
  if (issueId) return issueId;
  const conflictId = conflict.id?.trim();
  return conflictId || undefined;
}
