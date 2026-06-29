import { useCallback, useEffect, useState } from 'react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import { allocationsToEvaluateBreakdown } from '@/lib/trip-budget-normalize';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { BudgetEvaluationResponse } from '@/types/trip';

export interface UseBudgetTabEvaluationOptions {
  tripId: string | null | undefined;
  planId?: string | null;
  profile: TripBudgetProfile | null;
  enabled?: boolean;
}

export function useBudgetTabEvaluation({
  tripId,
  planId,
  profile,
  enabled = true,
}: UseBudgetTabEvaluationOptions) {
  const [evaluation, setEvaluation] = useState<BudgetEvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runEvaluation = useCallback(async () => {
    if (!tripId || !profile?.intent?.total) {
      setEvaluation(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const breakdown = profile.actuals?.categoryBreakdown;
      const result = await planningWorkbenchApi.evaluateBudget({
        tripId,
        planId: planId ?? undefined,
        estimatedCost: profile.actuals?.totalEstimated,
        ...(breakdown ? { categoryBreakdown: allocationsToEvaluateBreakdown(breakdown) } : {}),
        budgetConstraint: {
          total: profile.intent.total,
          currency: profile.intent.currency,
          dailyBudget: profile.intent.dailyBudget,
        },
      });
      setEvaluation(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '预算评估失败';
      setError(message);
      setEvaluation(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, planId, profile?.actuals?.categoryBreakdown, profile?.actuals?.totalEstimated, profile?.intent]);

  useEffect(() => {
    if (!enabled || !tripId || !profile?.intent?.total) {
      setEvaluation(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const breakdown = profile.actuals?.categoryBreakdown;
    void planningWorkbenchApi
      .evaluateBudget({
        tripId,
        planId: planId ?? undefined,
        estimatedCost: profile.actuals?.totalEstimated,
        ...(breakdown ? { categoryBreakdown: allocationsToEvaluateBreakdown(breakdown) } : {}),
        budgetConstraint: {
          total: profile.intent.total,
          currency: profile.intent.currency,
          dailyBudget: profile.intent.dailyBudget,
        },
      })
      .then((result) => {
        if (!cancelled) setEvaluation(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '预算评估失败');
          setEvaluation(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    tripId,
    planId,
    profile?.updatedAt,
    profile?.intent?.total,
    profile?.intent?.currency,
    profile?.intent?.dailyBudget,
    profile?.actuals?.totalEstimated,
    profile?.actuals?.categoryBreakdown,
  ]);

  return {
    evaluation,
    loading,
    error,
    refreshEvaluation: runEvaluation,
  };
}
