import type { PlanningConflictItem, PlanningConflictSummary } from '@/lib/planning-conflicts.util';

export interface DecisionCheckerPlanningInterim {
  total: number;
  mustHandle: number;
  suggestAdjust: number;
  verdictHeadline?: string;
  topConflictTitle?: string;
  topConflictMessage?: string;
}

export function buildDecisionCheckerPlanningInterim(input: {
  summary: PlanningConflictSummary;
  items: PlanningConflictItem[];
  verdictHeadline?: string | null;
  planningLoading?: boolean;
}): DecisionCheckerPlanningInterim | null {
  const { summary, items, verdictHeadline, planningLoading } = input;
  if (planningLoading && summary.total === 0 && items.length === 0) {
    return null;
  }

  const top =
    items.find((item) => item.priority === 'must_handle') ??
    items.find((item) => item.priority === 'suggest_adjust') ??
    items[0];

  return {
    total: summary.total,
    mustHandle: summary.mustHandle,
    suggestAdjust: summary.suggestAdjust,
    verdictHeadline: verdictHeadline ?? undefined,
    topConflictTitle: top?.title,
    topConflictMessage: top?.message,
  };
}
