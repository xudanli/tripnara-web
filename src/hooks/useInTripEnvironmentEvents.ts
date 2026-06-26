import { useCallback, useEffect, useState } from 'react';
import { inTripExecutionApi } from '@/api/in-trip-execution';
import type { EnvironmentEventSummary } from '@/types/in-trip-execution';

export function useInTripEnvironmentEvents(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [events, setEvents] = useState<EnvironmentEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripExecutionApi.listEnvironmentEvents(tripId);
      setEvents(result);
    } catch (e) {
      console.error('[useInTripEnvironmentEvents] load failed', e);
      setEvents([]);
      setError(e instanceof Error ? e.message : '加载环境预警失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  return { events, loading, error, reload };
}
