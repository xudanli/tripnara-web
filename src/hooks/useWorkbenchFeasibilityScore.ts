import { useMemo } from 'react';
import type { PlanningConflictsResponse } from '@/types/planning-conflicts';
import { deriveWorkbenchFeasibilityScore } from '@/pages/plan-studio/hooks/useWorkbenchData';

/** 工作台顶栏可行度评分 — 来自 planning-conflicts BFF，不再单独 GET feasibility-report */
export function useWorkbenchFeasibilityScore(
  bundle: PlanningConflictsResponse | null | undefined,
  loading: boolean,
) {
  const score = useMemo(() => deriveWorkbenchFeasibilityScore(bundle), [bundle]);

  return {
    score,
    loading,
    error: null as string | null,
    reload: async () => {},
  };
}
