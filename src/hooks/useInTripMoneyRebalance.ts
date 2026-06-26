import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { inTripMoneyApi } from '@/api/in-trip-money';
import type { RebalanceSuggestionSummary, RebalanceResponse } from '@/types/in-trip-money';

export function useInTripMoneyRebalance(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [suggestions, setSuggestions] = useState<RebalanceSuggestionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripMoneyApi.listRebalanceSuggestions(tripId);
      setSuggestions(result.filter((s) => s.status === 'pending'));
    } catch (e) {
      console.error('[useInTripMoneyRebalance] load failed', e);
      setSuggestions([]);
      setError(e instanceof Error ? e.message : '加载再平衡建议失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setSuggestions([]);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  const respond = useCallback(
    async (suggestionId: string, response: RebalanceResponse) => {
      if (!tripId) return;
      try {
        setRespondingId(suggestionId);
        await inTripMoneyApi.respondRebalance(tripId, suggestionId, response);
        toast.success(response === 'accept' ? '已接受建议' : '已保持现状');
        await reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '操作失败');
      } finally {
        setRespondingId(null);
      }
    },
    [tripId, reload],
  );

  return { suggestions, loading, error, respondingId, reload, respond };
}
