/**
 * Plan Studio 预算 Tab — 四层预算 · 三栏工作台
 * @see docs/prd/travel-budget-four-layer-prd.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { BudgetTabSkeleton } from '@/components/plan-studio/BudgetTabSkeleton';
import { BudgetPlanningWorkbench } from '@/components/budget/workbench/BudgetPlanningWorkbench';
import type { BudgetAddExpenseFormValues } from '@/components/budget/BudgetAddExpenseDialog';
import { toCreateLedgerRequest } from '@/components/budget/BudgetAddExpenseDialog';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { tripsApi } from '@/api/trips';
import { useAuth } from '@/hooks/useAuth';
import { useBudgetPlanComparison } from '@/hooks/useBudgetPlanComparison';
import { useBudgetTabEvaluation } from '@/hooks/useBudgetTabEvaluation';
import { useBudgetWorkbenchDetails } from '@/hooks/useBudgetWorkbenchDetails';
import { useSplitConsensus } from '@/hooks/useDecisionProfiling';
import { useTripBudgetProfile } from '@/hooks/useTripBudgetProfile';
import { useWorkbenchTripConstraints } from '@/pages/plan-studio/hooks/useWorkbenchData';
import {
  mapPriceEvidenceForChecker,
  resolveEvaluationEvidence,
  resolveEvaluationHotspots,
  resolveEvaluationSuggestionsFromSources,
  resolveOptimizationIds,
} from '@/lib/budget-evaluate.util';
import { formatCurrency } from '@/utils/format';
import { usePlanStudioCompareStore } from '@/store/planStudioCompareStore';
import type { BudgetOptimizationSuggestion } from '@/types/trip';

interface BudgetTabProps {
  tripId: string;
  planId?: string | null;
  tripDayCount?: number;
  tripDayDates?: string[];
}

export default function BudgetTab({
  tripId,
  planId: planIdProp = null,
  tripDayCount = 0,
  tripDayDates = [],
}: BudgetTabProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const { user } = useAuth();

  const [resolvedPlanId, setResolvedPlanId] = useState<string | null>(null);
  const [optimizations, setOptimizations] = useState<BudgetOptimizationSuggestion[]>([]);
  const [optimizationsLoading, setOptimizationsLoading] = useState(false);
  const [applyingOptimization, setApplyingOptimization] = useState(false);

  const {
    profile,
    balances,
    unpaidItems,
    actualLineItems,
    loading,
    savingIntent,
    savingStructure,
    addingExpense,
    updatingItemCost,
    saveIntent,
    saveStructureFromAllocations,
    applyPersonaPreset,
    applyEqualSplit,
    addLedgerExpense,
    updateItemCost,
    reload,
  } = useTripBudgetProfile(tripId);

  const constraintsQuery = useWorkbenchTripConstraints(tripId);
  const tripConstraints = constraintsQuery.data?.items ?? [];

  const walletMemberCount =
    profile?.wallet?.members?.length ?? profile?.wallet?.paymentRule?.splitBase ?? 0;
  const splitConsensusEnabled = walletMemberCount >= 2;
  const { data: splitConsensus, loading: splitConsensusLoading } = useSplitConsensus(tripId, {
    enabled: splitConsensusEnabled,
  });

  useEffect(() => {
    if (planIdProp) {
      setResolvedPlanId(planIdProp);
      return;
    }
    let cancelled = false;
    void planningWorkbenchApi
      .getTripPlans(tripId, { limit: 1, offset: 0 })
      .then((response) => {
        if (!cancelled && response.plans.length > 0) {
          setResolvedPlanId(response.plans[0].planId);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedPlanId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, planIdProp]);

  const effectivePlanId = planIdProp ?? resolvedPlanId ?? null;

  const {
    evaluation,
    loading: evaluationLoading,
    refreshEvaluation,
  } = useBudgetTabEvaluation({
    tripId,
    planId: effectivePlanId,
    profile,
    enabled: Boolean(profile?.intent?.total),
  });

  const {
    details,
    loading: detailsLoading,
    refreshDetails,
  } = useBudgetWorkbenchDetails({
    tripId,
    planId: effectivePlanId,
    enabled: Boolean(profile?.intent?.total),
  });

  const seedOptionComparison = usePlanStudioCompareStore((state) => state.byTripId[tripId]);

  const {
    rows: comparisonRows,
    comparison,
    recommendedPlanId: comparisonRecommendedPlanId,
    loading: comparisonLoading,
    refreshComparison,
  } = useBudgetPlanComparison({
    tripId,
    currentPlanId: effectivePlanId,
    profile,
    isZh,
    enabled: Boolean(profile?.intent?.total),
    seedOptionComparison,
  });

  const applyPlanId = details?.planId ?? evaluation?.planId ?? effectivePlanId;
  const currency = profile?.intent?.currency ?? profile?.actuals?.currency ?? 'CNY';

  const evaluationHotspots = useMemo(
    () =>
      resolveEvaluationHotspots(evaluation, isZh, {
        intentTotal: profile?.intent?.total ?? 0,
        totalEstimated: profile?.actuals?.totalEstimated ?? 0,
      }),
    [evaluation, isZh, profile?.intent?.total, profile?.actuals?.totalEstimated],
  );
  const evaluationSuggestions = useMemo(
    () => resolveEvaluationSuggestionsFromSources(details?.optimizations, evaluation),
    [details?.optimizations, evaluation],
  );
  const evaluationEvidence = useMemo(
    () => resolveEvaluationEvidence(details?.evidence, evaluation?.evidence),
    [details?.evidence, evaluation?.evidence],
  );
  const priceEvidence = useMemo(
    () =>
      mapPriceEvidenceForChecker(
        details?.priceEvidence ?? comparison?.priceEvidence ?? null,
      ),
    [comparison?.priceEvidence, details?.priceEvidence],
  );
  const optimizationIds = useMemo(
    () => resolveOptimizationIds(details?.optimizations, evaluation),
    [details?.optimizations, evaluation],
  );
  const draftReady = optimizationIds.length > 0;

  useEffect(() => {
    if (optimizationIds.length > 0) {
      setOptimizations([]);
      setOptimizationsLoading(false);
      return;
    }
    let cancelled = false;
    setOptimizationsLoading(true);
    void tripsApi
      .getBudgetOptimization(tripId)
      .then((items) => {
        if (!cancelled) setOptimizations(items);
      })
      .catch(() => {
        if (!cancelled) setOptimizations([]);
      })
      .finally(() => {
        if (!cancelled) setOptimizationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, profile?.updatedAt, optimizationIds.length]);

  const handleAddLedgerExpense = async (values: BudgetAddExpenseFormValues) => {
    await addLedgerExpense(toCreateLedgerRequest(values));
  };

  const runApplyOptimization = useCallback(
    async (ids: string[], autoCommit: boolean) => {
      if (!applyPlanId) {
        toast.error(isZh ? '缺少方案 ID，无法应用优化' : 'Missing plan ID; cannot apply optimization.');
        return null;
      }
      if (ids.length === 0) {
        toast.error(isZh ? '暂无可用优化草案' : 'No optimization draft available.');
        return null;
      }

      setApplyingOptimization(true);
      try {
        const result = await planningWorkbenchApi.applyBudgetOptimization({
          planId: applyPlanId,
          tripId,
          optimizationIds: ids,
          autoCommit,
        });

        const successCount = result.appliedOptimizations.filter((item) => item.status === 'success').length;
        const savingsLabel = formatCurrency(result.totalSavings, currency);

        if (result.dryRun ?? !autoCommit) {
          toast.success(
            isZh
              ? `预览完成：${successCount} 项优化，预计节省 ${savingsLabel}，新预估 ${formatCurrency(result.newEstimatedCost, currency)}`
              : `Preview: ${successCount} optimizations, est. savings ${savingsLabel}, new total ${formatCurrency(result.newEstimatedCost, currency)}`,
            { duration: 6000 },
          );
        } else {
          toast.success(
            isZh
              ? `已应用 ${successCount} 项优化，预计节省 ${savingsLabel}`
              : `Applied ${successCount} optimizations, est. savings ${savingsLabel}`,
            { duration: 5000 },
          );
          await reload();
          void refreshEvaluation();
          void refreshDetails();
          void refreshComparison();
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : isZh ? '应用优化失败' : 'Failed to apply optimization';
        toast.error(message);
        return null;
      } finally {
        setApplyingOptimization(false);
      }
    },
    [
      applyPlanId,
      tripId,
      currency,
      isZh,
      reload,
      refreshEvaluation,
      refreshDetails,
      refreshComparison,
    ],
  );

  const handleGenerateDraft = useCallback(async () => {
    let ids = optimizationIds;
    if (ids.length === 0) {
      const fresh = await refreshEvaluation();
      ids = resolveOptimizationIds(details?.optimizations, fresh);
      if (ids.length === 0) {
        const refreshedDetails = await refreshDetails();
        ids = resolveOptimizationIds(refreshedDetails?.optimizations, fresh);
      }
    }
    await runApplyOptimization(ids, false);
  }, [optimizationIds, refreshEvaluation, refreshDetails, details?.optimizations, runApplyOptimization]);

  const handleApplyAllOptimizations = useCallback(async () => {
    let ids = optimizationIds;
    if (ids.length === 0) {
      const fresh = await refreshEvaluation();
      ids = resolveOptimizationIds(details?.optimizations, fresh);
    }
    await runApplyOptimization(ids, true);
  }, [optimizationIds, refreshEvaluation, details?.optimizations, runApplyOptimization]);

  const handleApplyOptimization = useCallback(
    async (optimizationId: string) => {
      await runApplyOptimization([optimizationId], true);
    },
    [runApplyOptimization],
  );

  if (loading) {
    return <BudgetTabSkeleton />;
  }

  return (
    <BudgetPlanningWorkbench
      tripId={tripId}
      profile={profile}
      balances={balances}
      unpaidItems={unpaidItems}
      actualLineItems={actualLineItems}
      currentUserId={user?.id}
      tripDayCount={tripDayCount}
      tripDayDates={tripDayDates}
      optimizations={optimizations}
      optimizationsLoading={optimizationsLoading || evaluationLoading || detailsLoading}
      evaluationMessage={evaluation?.reason}
      evaluationHotspots={evaluationHotspots}
      evaluationSuggestions={evaluationSuggestions}
      evaluationEvidence={evaluationEvidence}
      priceEvidence={priceEvidence}
      comparisonRows={comparisonRows}
      comparisonLoading={comparisonLoading}
      recommendedPlanId={comparisonRecommendedPlanId}
      draftReady={draftReady}
      applyingOptimization={applyingOptimization}
      savingIntent={savingIntent}
      savingStructure={savingStructure}
      addingExpense={addingExpense}
      updatingItemCost={updatingItemCost}
      onSaveIntent={saveIntent}
      onSaveStructure={saveStructureFromAllocations}
      onApplyPersonaPreset={applyPersonaPreset}
      onEqualSplit={applyEqualSplit}
      onAddLedgerExpense={handleAddLedgerExpense}
      onUpdateItemCost={updateItemCost}
      splitConsensus={splitConsensusEnabled ? splitConsensus : null}
      splitConsensusLoading={splitConsensusEnabled && splitConsensusLoading}
      tripConstraints={tripConstraints}
      onGenerateOptimization={() => {
        void handleGenerateDraft();
      }}
      onApplyAllOptimizations={() => {
        void handleApplyAllOptimizations();
      }}
      onApplyOptimization={(id) => {
        void handleApplyOptimization(id);
      }}
      onRefresh={() => {
        void reload();
        void refreshEvaluation();
        void refreshDetails();
        void refreshComparison();
      }}
    />
  );
}
