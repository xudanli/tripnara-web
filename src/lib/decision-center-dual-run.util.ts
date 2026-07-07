import type {
  DecisionCenterRecentDecisionSnapshot,
  DecisionProblemSummary,
} from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import { countOpenDecisionProblems } from '@/lib/decision-center.util';
import { resolveDecisionProblemForConflict } from '@/lib/planning-conflicts-decision.util';

export interface DecisionCenterDualRunMetrics {
  bffOpenCount: number;
  bffTotalCount: number;
  legacyInboxCount: number;
  legacyMustHandleCount: number;
  matchedConflictCount: number;
  unmatchedConflicts: PlanningConflictItem[];
  orphanProblems: DecisionProblemSummary[];
}

/** Phase 1 双运行：对比 decision-problems vs planning-conflicts */
export function computeDecisionCenterDualRunMetrics(input: {
  decisionProblems: DecisionProblemSummary[];
  planningConflicts: PlanningConflictItem[];
  inboxCount: number;
  mustHandleCount: number;
  recentDecisions?: DecisionCenterRecentDecisionSnapshot[] | null;
}): DecisionCenterDualRunMetrics {
  const { decisionProblems, planningConflicts, inboxCount, mustHandleCount, recentDecisions } =
    input;

  const pendingConflicts = planningConflicts.filter(
    (item) => item.priority !== 'pending_confirm',
  );

  const matchedConflictIds = new Set<string>();
  const matchedProblemIds = new Set<string>();

  for (const conflict of pendingConflicts) {
    const matched = resolveDecisionProblemForConflict(conflict, decisionProblems);
    if (matched) {
      matchedConflictIds.add(conflict.id);
      matchedProblemIds.add(matched.id);
    }
  }

  const unmatchedConflicts = pendingConflicts.filter((c) => !matchedConflictIds.has(c.id));
  const orphanProblems = decisionProblems.filter(
    (p) => !matchedProblemIds.has(p.id) && (p.status === 'OPEN' || p.status === 'WAITING_DECISION'),
  );

  return {
    bffOpenCount: countOpenDecisionProblems(decisionProblems, recentDecisions),
    bffTotalCount: decisionProblems.length,
    legacyInboxCount: inboxCount,
    legacyMustHandleCount: mustHandleCount,
    matchedConflictCount: matchedConflictIds.size,
    unmatchedConflicts,
    orphanProblems,
  };
}
