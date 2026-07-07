import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  planningWorkbenchApi,
  pickWorkbenchOptionComparison,
  type ComparePlansResponse,
  type ExecutePlanningWorkbenchResponse,
  type PlanSummary,
  type TripPlansResponse,
} from '@/api/planning-workbench';
import type { TripDetail } from '@/types/trip';
import type { PlanGateDraftDiff } from '@/types/plan-gate';
import {
  buildMetricRowsFromDraftDiff,
  resolveDraftDiffChangeItems,
} from '@/lib/plan-gate-draft-diff.util';
import {
  buildPlanGateChangeList,
  buildPlanGateCompareMetricRows,
  buildPlanGateDraftMetrics,
  buildPlanGateTripBaselineMetrics,
  type PlanGateCompareMetricRow,
  type PlanGateCompareSideMetrics,
} from '@/lib/plan-gate-diff.util';

export interface UsePlanGateCompareOptions {
  tripId: string;
  trip: TripDetail | null;
  result: ExecutePlanningWorkbenchResponse | null;
  currency?: string;
  enabled?: boolean;
}

export function usePlanGateCompare({
  tripId,
  trip,
  result,
  currency = 'CNY',
  enabled = true,
}: UsePlanGateCompareOptions) {
  const [loading, setLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<TripPlansResponse | null>(null);
  const [compareResult, setCompareResult] = useState<ComparePlansResponse | null>(null);
  const [remoteDraftDiff, setRemoteDraftDiff] = useState<PlanGateDraftDiff | null>(null);
  const [baselinePlanId, setBaselinePlanId] = useState<string | null>(null);
  const [useTripBaseline, setUseTripBaseline] = useState(false);

  const draftPlanId = result?.planState?.plan_id ?? null;
  const embeddedDraftDiff = result?.uiOutput.planGate?.draftDiff ?? null;

  const draftDiff = useMemo(() => {
    if (useTripBaseline) return null;
    return remoteDraftDiff ?? embeddedDraftDiff;
  }, [embeddedDraftDiff, remoteDraftDiff, useTripBaseline]);

  const loadAvailablePlans = useCallback(async () => {
    if (!tripId) return null;
    try {
      const plansData = await planningWorkbenchApi.getTripPlans(tripId, { limit: 20, offset: 0 });
      setAvailablePlans(plansData);
      return plansData;
    } catch (err) {
      console.error('[Plan Gate] Failed to load trip plans:', err);
      return null;
    }
  }, [tripId]);

  const pickDefaultBaselinePlan = useCallback(
    (plans: PlanSummary[]): PlanSummary | null => {
      if (!draftPlanId) return null;
      const candidates = plans
        .filter((p) => p.planId !== draftPlanId)
        .sort((a, b) => b.planVersion - a.planVersion);
      const locked = candidates.find((p) => p.status === 'LOCKED' || p.status === 'PROPOSED');
      return locked ?? candidates[0] ?? null;
    },
    [draftPlanId],
  );

  const runCompare = useCallback(
    async (baselineId: string) => {
      if (!draftPlanId) return;
      setLoading(true);
      try {
        if (
          embeddedDraftDiff?.baselinePlanId === baselineId &&
          !remoteDraftDiff
        ) {
          setBaselinePlanId(baselineId);
          setUseTripBaseline(false);
          setCompareResult(null);
          return;
        }

        try {
          await planningWorkbenchApi.getState(baselineId);
        } catch {
          toast.error('基准方案不存在或已被删除');
          setBaselinePlanId(null);
          setRemoteDraftDiff(null);
          setCompareResult(null);
          return;
        }

        let diff: PlanGateDraftDiff | undefined;
        let compareResponse: ComparePlansResponse | null = null;

        try {
          diff = await planningWorkbenchApi.getPlanDiff(draftPlanId, baselineId);
        } catch (err) {
          console.warn('[Plan Gate] getPlanDiff failed, falling back to comparePlans:', err);
        }

        if (!diff || (!diff.timelineChanges?.length && !diff.changeLog?.length && !diff.metrics)) {
          compareResponse = await planningWorkbenchApi.comparePlans({
            planIds: [baselineId, draftPlanId],
          });
          diff = compareResponse.draftDiff ?? diff;
        }

        setRemoteDraftDiff(diff ?? null);
        setCompareResult(compareResponse);
        setBaselinePlanId(baselineId);
        setUseTripBaseline(false);
      } catch (err: unknown) {
        console.error('[Plan Gate] compare failed:', err);
        toast.error(err instanceof Error ? err.message : '对比方案失败');
        setRemoteDraftDiff(null);
        setCompareResult(null);
      } finally {
        setLoading(false);
      }
    },
    [draftPlanId, embeddedDraftDiff?.baselinePlanId, remoteDraftDiff],
  );

  const refreshCompare = useCallback(async () => {
    if (!enabled || !result) return;

    if (embeddedDraftDiff?.baselinePlanId) {
      setBaselinePlanId(embeddedDraftDiff.baselinePlanId);
      setRemoteDraftDiff(null);
      setUseTripBaseline(false);
      setCompareResult(null);
      return;
    }

    setLoading(true);
    try {
      const plansData = availablePlans ?? (await loadAvailablePlans());
      const baseline = plansData ? pickDefaultBaselinePlan(plansData.plans) : null;
      if (baseline?.planId) {
        await runCompare(baseline.planId);
      } else {
        setBaselinePlanId(null);
        setRemoteDraftDiff(null);
        setCompareResult(null);
        setUseTripBaseline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [
    availablePlans,
    embeddedDraftDiff?.baselinePlanId,
    enabled,
    loadAvailablePlans,
    pickDefaultBaselinePlan,
    result,
    runCompare,
  ]);

  useEffect(() => {
    if (!enabled || !result) return;
    void refreshCompare();
  }, [enabled, result?.planState?.plan_id]);

  const tripBaseline = useMemo(
    () => buildPlanGateTripBaselineMetrics(trip),
    [trip],
  );

  const draftMetrics = useMemo(
    () => (result ? buildPlanGateDraftMetrics(result) : null),
    [result],
  );

  const baselineMetrics: PlanGateCompareSideMetrics = useMemo(() => {
    if (draftDiff) {
      return {
        label: draftDiff.baselineLabel ?? '基准',
        itemCount: 0,
        dayCount: 0,
        budget: null,
        gateStatus: null,
        executabilityScore: null,
        fatigueScore: null,
      };
    }

    if (baselinePlanId && compareResult?.plans?.length) {
      const baselinePlan =
        compareResult.plans.find((p) => p.planId === baselinePlanId) ?? compareResult.plans[0];
      if (baselinePlan) {
        const response: ExecutePlanningWorkbenchResponse = {
          planState: baselinePlan.planState,
          uiOutput: baselinePlan.uiOutput,
        };
        return buildPlanGateDraftMetrics(response);
      }
    }
    return tripBaseline;
  }, [baselinePlanId, compareResult, draftDiff, tripBaseline]);

  const metricRows: PlanGateCompareMetricRow[] = useMemo(() => {
    if (draftDiff?.metrics) {
      const rows = buildMetricRowsFromDraftDiff(draftDiff, currency);
      if (rows.length > 0) return rows;
    }
    if (!draftMetrics) return [];
    return buildPlanGateCompareMetricRows(baselineMetrics, draftMetrics, currency);
  }, [baselineMetrics, currency, draftDiff, draftMetrics]);

  const changeItems = useMemo(() => {
    if (draftDiff) return resolveDraftDiffChangeItems(draftDiff);
    if (result) return buildPlanGateChangeList(result, compareResult);
    return [];
  }, [compareResult, draftDiff, result]);

  const optionComparison = useMemo(() => {
    if (!result) return undefined;
    const fromResult = pickWorkbenchOptionComparison([result]);
    if (fromResult) return fromResult;
    if (!compareResult?.plans?.length) return undefined;
    return pickWorkbenchOptionComparison(
      compareResult.plans.map((p) => ({
        planState: p.planState,
        uiOutput: p.uiOutput,
      })),
    );
  }, [compareResult, result]);

  const baselineOptions = useMemo(() => {
    const plans = availablePlans?.plans ?? [];
    const options = [
      { id: '__trip__', label: '当前时间轴', planVersion: null as number | null },
      ...plans
        .filter((p) => p.planId !== draftPlanId)
        .map((p) => ({
          id: p.planId,
          label: `方案 A${p.planVersion}`,
          planVersion: p.planVersion,
        })),
    ];

    if (
      embeddedDraftDiff?.baselinePlanId &&
      !options.some((o) => o.id === embeddedDraftDiff.baselinePlanId)
    ) {
      options.splice(1, 0, {
        id: embeddedDraftDiff.baselinePlanId,
        label: embeddedDraftDiff.baselineLabel ?? `方案 ${embeddedDraftDiff.baselinePlanId}`,
        planVersion: null,
      });
    }

    return options;
  }, [availablePlans?.plans, draftPlanId, embeddedDraftDiff]);

  const selectBaseline = useCallback(
    async (baselineId: string) => {
      if (baselineId === '__trip__') {
        setBaselinePlanId(null);
        setRemoteDraftDiff(null);
        setCompareResult(null);
        setUseTripBaseline(true);
        return;
      }

      if (
        baselineId === embeddedDraftDiff?.baselinePlanId &&
        embeddedDraftDiff
      ) {
        setBaselinePlanId(baselineId);
        setRemoteDraftDiff(null);
        setCompareResult(null);
        setUseTripBaseline(false);
        return;
      }

      await runCompare(baselineId);
    },
    [embeddedDraftDiff, runCompare],
  );

  const selectedBaselineId = useTripBaseline
    ? '__trip__'
    : baselinePlanId ?? embeddedDraftDiff?.baselinePlanId ?? '__trip__';

  return {
    loading,
    compareResult,
    draftDiff,
    baselineMetrics,
    draftMetrics,
    metricRows,
    changeItems,
    optionComparison,
    baselineOptions,
    selectedBaselineId,
    selectBaseline,
    refreshCompare,
    loadAvailablePlans,
  };
}
