import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { decisionProblemsApi } from '@/api/decision-problems';
import { tripsApi } from '@/api/trips';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import {
  decisionProblemsQueryKeys,
  fetchDecisionProblemsList,
} from '@/hooks/decision-problems-query.util';
import {
  assertDecisionSurfaceCountsAligned,
  assertEntityInBothSurfaces,
  type DecisionSurfaceAlignmentResult,
} from '@/lib/decision-surface-count-alignment.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';

export interface UseDecisionSurfaceAlignmentProbeOptions {
  enabled?: boolean;
  timelineConflictCount?: number;
  timelineConflictCountSource?: string;
  /** 联调断言：F208 等实体应同时在 problems + conflicts 出现 */
  entityRef?: string;
  /** 父级已加载时可跳过 probe fetch */
  problemsOpenCount?: number;
  conflictsTotal?: number;
  overviewOpenCount?: number;
  decisionProblems?: DecisionProblemSummary[];
  planningConflicts?: PlanningConflictItem[];
}

export interface DecisionSurfaceAlignmentProbe {
  loading: boolean;
  countAlignment: DecisionSurfaceAlignmentResult | null;
  entityAligned: boolean | null;
  /** 供 DecisionSurfaceAlignmentDevHint 复用 */
  snapshot: {
    problemsOpenCount?: number;
    conflictsTotal?: number;
    overviewOpenCount?: number;
    timelineConflictCount?: number;
    decisionProblems: DecisionProblemSummary[];
    planningConflicts: PlanningConflictItem[];
  };
}

/** DEV 联调：并行探测 decision-problems meta 与 planning-conflicts summary */
export function useDecisionSurfaceAlignmentProbe(
  tripId: string | undefined,
  options: UseDecisionSurfaceAlignmentProbeOptions = {},
): DecisionSurfaceAlignmentProbe {
  const queryClient = useQueryClient();
  const {
    enabled = import.meta.env.DEV,
    timelineConflictCount,
    timelineConflictCountSource,
    entityRef = 'F208',
    problemsOpenCount: problemsOpenCountProp,
    conflictsTotal: conflictsTotalProp,
    overviewOpenCount: overviewOpenCountProp,
    decisionProblems: decisionProblemsProp,
    planningConflicts: planningConflictsProp,
  } = options;

  const [loading, setLoading] = useState(false);
  const [problemsOpenCount, setProblemsOpenCount] = useState<number | undefined>(
    problemsOpenCountProp,
  );
  const [conflictsTotal, setConflictsTotal] = useState<number | undefined>(conflictsTotalProp);
  const [decisionProblems, setDecisionProblems] = useState(decisionProblemsProp ?? []);
  const [planningConflicts, setPlanningConflicts] = useState(planningConflictsProp ?? []);

  useEffect(() => {
    setProblemsOpenCount(problemsOpenCountProp);
    setConflictsTotal(conflictsTotalProp);
    if (decisionProblemsProp) setDecisionProblems(decisionProblemsProp);
    if (planningConflictsProp) setPlanningConflicts(planningConflictsProp);
  }, [
    problemsOpenCountProp,
    conflictsTotalProp,
    decisionProblemsProp,
    planningConflictsProp,
  ]);

  useEffect(() => {
    if (!enabled || !tripId) return;
    if (problemsOpenCountProp != null && conflictsTotalProp != null) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const cachedList = tripId
          ? queryClient.getQueryData<Awaited<ReturnType<typeof fetchDecisionProblemsList>>>(
              decisionProblemsQueryKeys.list(tripId),
            )
          : undefined;

        const [problemsResult, conflictsResult] = await Promise.all([
          cachedList
            ? Promise.resolve(cachedList)
            : isUnifiedDecisionGatewayEnabled()
              ? decisionProblemsApi.listUnifiedByTrip(tripId!).catch(() => null)
              : decisionProblemsApi.listByTrip(tripId!).catch(() => null),
          tripsApi.getPlanningConflicts(tripId!, { includeDecisionChecker: false }).catch(() => null),
        ]);

        if (cancelled) return;

        if (problemsResult && 'meta' in problemsResult && problemsResult.meta) {
          setProblemsOpenCount(problemsResult.meta.openCount);
          if ('items' in problemsResult && Array.isArray(problemsResult.items)) {
            setDecisionProblems(problemsResult.items);
          }
        } else if (problemsResult && 'items' in problemsResult) {
          setDecisionProblems(problemsResult.items ?? []);
        }

        if (conflictsResult?.summary) {
          setConflictsTotal(conflictsResult.summary.total);
        }
        if (conflictsResult?.items?.length) {
          setPlanningConflicts(conflictsResult.items);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, tripId, problemsOpenCountProp, conflictsTotalProp, queryClient]);

  const countAlignment =
    enabled && (problemsOpenCount != null || conflictsTotal != null || timelineConflictCount != null)
      ? assertDecisionSurfaceCountsAligned({
          problemsOpenCount,
          conflictsTotal,
          overviewOpenCount: overviewOpenCountProp,
          timelineConflictCount,
          timelineConflictCountSource,
        })
      : null;

  const entityAligned =
    enabled && entityRef && decisionProblems.length && planningConflicts.length
      ? assertEntityInBothSurfaces(entityRef, decisionProblems, planningConflicts)
      : null;

  return {
    loading,
    countAlignment,
    entityAligned,
    snapshot: {
      problemsOpenCount,
      conflictsTotal,
      overviewOpenCount: overviewOpenCountProp,
      timelineConflictCount,
      decisionProblems,
      planningConflicts,
    },
  };
}
