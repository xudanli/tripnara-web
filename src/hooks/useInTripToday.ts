import { useCallback, useEffect, useState } from 'react';
import {
  inTripExecutionApi,
  isInTripDisabledError,
  isInTripNotFoundError,
} from '@/api/in-trip-execution';
import type { TodayDashboardSnapshot } from '@/types/in-trip-execution';

export interface UseInTripTodayResult {
  data: TodayDashboardSnapshot | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  notAvailable: boolean;
  reload: () => Promise<void>;
}

export function useInTripToday(
  tripId: string | null | undefined,
  enabled = true,
): UseInTripTodayResult {
  const [data, setData] = useState<TodayDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      setDisabled(false);
      setNotAvailable(false);
      const result = await inTripExecutionApi.getToday(tripId);
      setData(result);
    } catch (e) {
      console.error('[useInTripToday] load failed', e);
      setData(null);
      if (isInTripDisabledError(e)) {
        setDisabled(true);
        setError('行中模块尚未启用');
        return;
      }
      if (isInTripNotFoundError(e)) {
        setNotAvailable(true);
        setError(null);
        return;
      }
      const message = e instanceof Error ? e.message : '加载今日概览失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      setDisabled(false);
      setNotAvailable(false);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  return { data, loading, error, disabled, notAvailable, reload };
}
