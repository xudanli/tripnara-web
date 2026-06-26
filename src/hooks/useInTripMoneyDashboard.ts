import { useCallback, useEffect, useState } from 'react';
import { inTripMoneyApi, isMoneyBrainDisabledError } from '@/api/in-trip-money';
import type { MoneyDashboard } from '@/types/in-trip-money';

export function useInTripMoneyDashboard(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [data, setData] = useState<MoneyDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      setDisabled(false);
      const result = await inTripMoneyApi.getDashboard(tripId);
      setData(result);
    } catch (e) {
      console.error('[useInTripMoneyDashboard] load failed', e);
      setData(null);
      if (isMoneyBrainDisabledError(e)) {
        setDisabled(true);
        setError('Money Brain 尚未启用');
        return;
      }
      setError(e instanceof Error ? e.message : '加载消费仪表盘失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setData(null);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  return { data, loading, error, disabled, reload };
}
