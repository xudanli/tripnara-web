import { useMemo } from 'react';
import type { PlanningConflictsResponse } from '@/types/planning-conflicts';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import { deriveWorkbenchFeasibilityScore } from '@/pages/plan-studio/hooks/useWorkbenchData';
import {
  buildTravelAssuranceSummary,
  type TravelAssuranceSummary,
} from '@/lib/travel-assurance-summary.util';

/** 工作台顶栏可行度评分 + 行程保障摘要 */
export function useWorkbenchFeasibilityScore(
  bundle: PlanningConflictsResponse | null | undefined,
  loading: boolean,
  decisionProblems?: DecisionProblemSummary[] | null,
) {
  const score = useMemo(() => deriveWorkbenchFeasibilityScore(bundle), [bundle]);

  const assurance = useMemo((): TravelAssuranceSummary | null => {
    if (!bundle?.summary) return null;
    const openDecisionProblems =
      decisionProblems?.filter(
        (item) => item.status !== 'RESOLVED' && item.status !== 'DISMISSED',
      ).length ?? 0;
    return buildTravelAssuranceSummary({
      planningSummary: bundle.summary,
      openDecisionProblems,
    });
  }, [bundle?.summary, decisionProblems]);

  return {
    score,
    assurance,
    loading,
    error: null as string | null,
    reload: async () => {},
  };
}
