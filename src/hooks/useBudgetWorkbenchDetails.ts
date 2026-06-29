import { useCallback, useEffect, useState } from 'react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type { BudgetWorkbenchDetailsResponse } from '@/types/trip-budget';

export interface UseBudgetWorkbenchDetailsOptions {
  tripId: string | null | undefined;
  planId?: string | null;
  enabled?: boolean;
}

export function useBudgetWorkbenchDetails({
  tripId,
  planId,
  enabled = true,
}: UseBudgetWorkbenchDetailsOptions) {
  const [details, setDetails] = useState<BudgetWorkbenchDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDetails = useCallback(async () => {
    if (!tripId || !enabled) {
      setDetails(null);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await planningWorkbenchApi.getBudgetWorkbenchDetails(tripId, planId ?? undefined);
      setDetails(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取预算详情失败';
      setError(message);
      setDetails(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, planId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    void planningWorkbenchApi
      .getBudgetWorkbenchDetails(tripId, planId ?? undefined)
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '获取预算详情失败');
          setDetails(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, planId, enabled]);

  return {
    details,
    loading,
    error,
    refreshDetails,
  };
}
