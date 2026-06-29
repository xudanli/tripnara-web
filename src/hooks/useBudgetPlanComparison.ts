import { useCallback, useEffect, useState } from 'react';
import {
  planningWorkbenchApi,
  type OptionComparison,
  type PlanSummary,
} from '@/api/planning-workbench';
import {
  buildBudgetCompareRequest,
  mapOptionComparisonToBudgetRows,
  optionComparisonHasBudgetData,
  resolveBudgetComparisonRows,
  resolveRecommendedPlanId,
  type BudgetComparisonRow,
} from '@/lib/budget-compare.util';
import { publishPlanStudioComparison } from '@/store/planStudioCompareStore';
import type { BudgetCompareResponse, TripBudgetProfile } from '@/types/trip-budget';

export interface UseBudgetPlanComparisonOptions {
  tripId: string | null | undefined;
  currentPlanId?: string | null;
  profile: TripBudgetProfile | null;
  isZh: boolean;
  enabled?: boolean;
  /** Workbench / route_and_run 已投影的 OptionComparison BFF */
  seedOptionComparison?: OptionComparison | null;
}

function applyComparisonResult(
  tripId: string,
  result: BudgetCompareResponse,
  seedOptionComparison: OptionComparison | null | undefined,
  isZh: boolean,
): { rows: BudgetComparisonRow[]; optionComparison: OptionComparison | null } {
  const optionComparison = result.optionComparison ?? seedOptionComparison ?? null;
  if (optionComparison) {
    publishPlanStudioComparison(tripId, optionComparison);
  }
  return {
    optionComparison,
    rows: resolveBudgetComparisonRows(optionComparison, result, isZh),
  };
}

export function useBudgetPlanComparison({
  tripId,
  currentPlanId,
  profile,
  isZh,
  enabled = true,
  seedOptionComparison = null,
}: UseBudgetPlanComparisonOptions) {
  const [comparison, setComparison] = useState<BudgetCompareResponse | null>(null);
  const [optionComparison, setOptionComparison] = useState<OptionComparison | null>(
    optionComparisonHasBudgetData(seedOptionComparison) ? seedOptionComparison : null,
  );
  const [rows, setRows] = useState<BudgetComparisonRow[]>(() =>
    mapOptionComparisonToBudgetRows(seedOptionComparison, isZh),
  );
  const [planSummaries, setPlanSummaries] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!optionComparisonHasBudgetData(seedOptionComparison)) return;
    setOptionComparison(seedOptionComparison);
    setRows(mapOptionComparisonToBudgetRows(seedOptionComparison, isZh));
  }, [seedOptionComparison, isZh]);

  const runComparison = useCallback(async () => {
    if (!tripId || !enabled || !profile?.intent?.total) {
      setComparison(null);
      setRows([]);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      let summaries = planSummaries;
      if (summaries.length === 0) {
        const plansResponse = await planningWorkbenchApi.getTripPlans(tripId, { limit: 3, offset: 0 });
        summaries = plansResponse.plans;
        setPlanSummaries(summaries);
      }

      const request = buildBudgetCompareRequest(
        tripId,
        currentPlanId ?? null,
        profile,
        summaries,
        isZh,
      );
      if (!request || request.plans.length === 0) {
        setComparison(null);
        setRows([]);
        return null;
      }

      if (seedOptionComparison && !optionComparisonHasBudgetData(seedOptionComparison)) {
        request.optionComparison = seedOptionComparison;
      }

      const result = await planningWorkbenchApi.compareBudgetPlans(request);
      const applied = applyComparisonResult(tripId, result, seedOptionComparison, isZh);
      setComparison(result);
      setOptionComparison(applied.optionComparison);
      setRows(applied.rows);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '预算方案对比失败';
      setError(message);
      setComparison(null);
      setRows([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled, profile, planSummaries, currentPlanId, isZh, seedOptionComparison]);

  useEffect(() => {
    if (!tripId || !enabled || !profile?.intent?.total) {
      setComparison(null);
      setRows([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const plansResponse = await planningWorkbenchApi.getTripPlans(tripId, { limit: 3, offset: 0 });
        if (cancelled) return;
        setPlanSummaries(plansResponse.plans);

        const request = buildBudgetCompareRequest(
          tripId,
          currentPlanId ?? null,
          profile,
          plansResponse.plans,
          isZh,
        );
        if (!request || request.plans.length === 0) {
          setComparison(null);
          setRows([]);
          return;
        }

        if (seedOptionComparison && !optionComparisonHasBudgetData(seedOptionComparison)) {
          request.optionComparison = seedOptionComparison;
        }

        const result = await planningWorkbenchApi.compareBudgetPlans(request);
        if (cancelled) return;
        const applied = applyComparisonResult(tripId, result, seedOptionComparison, isZh);
        setComparison(result);
        setOptionComparison(applied.optionComparison);
        setRows(applied.rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '预算方案对比失败');
          setComparison(null);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    tripId,
    currentPlanId,
    enabled,
    isZh,
    seedOptionComparison,
    profile?.intent?.total,
    profile?.actuals?.totalEstimated,
    profile?.actuals?.categoryBreakdown,
    profile?.updatedAt,
  ]);

  const recommendedPlanId = resolveRecommendedPlanId(
    optionComparison,
    comparison?.recommendedPlanId ?? null,
  );

  return {
    comparison,
    optionComparison,
    rows,
    recommendedPlanId,
    loading,
    error,
    refreshComparison: runComparison,
  };
}
