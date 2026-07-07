import { useCallback, useEffect, useState } from 'react';
import {
  isExecutionAdvisoryDisabledError,
  isExecutionAdvisoryNotInTripError,
  tripConstraintSolverApi,
} from '@/api/trip-constraint-solver';
import type { TripState } from '@/types/trip';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';

export function useTripExecutionAdvisory(
  tripId: string | null | undefined,
  options?: {
    enabled?: boolean;
    tripState?: TripState | null;
    pollIntervalMs?: number;
  },
) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<TripExecutionAdvisoryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [notInTrip, setNotInTrip] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      setDisabled(false);
      setNotInTrip(false);
      const advisory = await tripConstraintSolverApi.getExecutionAdvisory(tripId, {
        tripState: options?.tripState,
      });
      setData(advisory);
    } catch (e) {
      console.error('[useTripExecutionAdvisory]', e);
      setData(null);
      if (isExecutionAdvisoryDisabledError(e)) {
        setDisabled(true);
        setError('行中执行守护未启用');
        return;
      }
      if (isExecutionAdvisoryNotInTripError(e)) {
        setNotInTrip(true);
        setError('行程未处于行中阶段');
        return;
      }
      setError(e instanceof Error ? e.message : '加载实时执行状态失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled, options?.tripState]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setData(null);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  useEffect(() => {
    if (!tripId || !enabled || !options?.pollIntervalMs) return;
    const id = window.setInterval(() => reload(), options.pollIntervalMs);
    return () => window.clearInterval(id);
  }, [tripId, enabled, options?.pollIntervalMs, reload]);

  const setAdvisory = useCallback((next: TripExecutionAdvisoryDto | null) => {
    setData(next);
  }, []);

  return { data, loading, error, disabled, notInTrip, reload, setAdvisory };
}
