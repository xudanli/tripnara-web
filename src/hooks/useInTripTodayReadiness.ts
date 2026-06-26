import { useCallback, useEffect, useState } from 'react';
import {
  inTripExecutionApi,
  isInTripNotFoundError,
} from '@/api/in-trip-execution';
import type { InTripTodayReadinessDetail } from '@/types/in-trip-execution';

export function useInTripTodayReadinessDetail(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [data, setData] = useState<InTripTodayReadinessDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const result = await inTripExecutionApi.getTodayReadiness(tripId);
      setData(result);
    } catch (e) {
      console.error('[useInTripTodayReadinessDetail] load failed', e);
      setData(null);
      if (isInTripNotFoundError(e)) {
        setNotFound(true);
        setError(null);
        return;
      }
      setError(e instanceof Error ? e.message : '加载今日就绪失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      setNotFound(false);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  return { data, loading, error, notFound, reload };
}
