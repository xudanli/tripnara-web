import { useCallback, useEffect, useState } from 'react';
import { planningWorkbenchApi } from '@/api/planning-workbench';
import type { PlanGatePreTripTasks } from '@/types/plan-gate';

export interface UsePlanGatePreTripTasksOptions {
  tripId: string;
  planId?: string | null;
  /** execute 响应内嵌的 preTripTasks，优先使用 */
  embedded?: PlanGatePreTripTasks | null;
  enabled?: boolean;
}

export function usePlanGatePreTripTasks({
  tripId,
  planId,
  embedded,
  enabled = true,
}: UsePlanGatePreTripTasksOptions) {
  const [remote, setRemote] = useState<PlanGatePreTripTasks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preTripTasks = embedded ?? remote;

  const refresh = useCallback(async () => {
    if (!tripId || !enabled) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await planningWorkbenchApi.getPlanGatePreTripTasks(
        tripId,
        planId ?? undefined,
      );
      setRemote(data);
      return data;
    } catch (err) {
      console.warn('[Plan Gate] pre-trip tasks load failed:', err);
      setError(err instanceof Error ? err.message : '加载行前任务失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, planId, tripId]);

  useEffect(() => {
    if (embedded || !enabled || !tripId) return;
    void refresh();
  }, [embedded, enabled, refresh, tripId, planId]);

  return {
    preTripTasks,
    loading,
    error,
    refresh,
  };
}

export function resolvePlanGatePreTripTasksTotal(
  preTripTasks?: PlanGatePreTripTasks | null,
  legacyCount?: number,
): number {
  if (preTripTasks?.total != null) return preTripTasks.total;
  if (legacyCount != null) return legacyCount;
  return 0;
}
