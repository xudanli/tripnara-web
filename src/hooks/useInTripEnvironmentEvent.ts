import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { inTripExecutionApi } from '@/api/in-trip-execution';
import { submitInTripCausalTelemetryForEnvironmentEvent } from '@/lib/causal-in-trip-telemetry';
import type { EnvironmentEventDetail } from '@/types/in-trip-execution';

export function useInTripEnvironmentEvent(
  tripId: string | null | undefined,
  eventId: string | null | undefined,
) {
  const [detail, setDetail] = useState<EnvironmentEventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [preferenceStrength, setPreferenceStrength] = useState(3);

  const reload = useCallback(async () => {
    if (!tripId || !eventId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripExecutionApi.getEnvironmentEvent(tripId, eventId);
      setDetail(result);
      setSelectedPlanId((prev) => prev ?? result.alternativePlans[0]?.planId ?? null);
    } catch (e) {
      console.error('[useInTripEnvironmentEvent] load failed', e);
      setDetail(null);
      setError(e instanceof Error ? e.message : '加载事件详情失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, eventId]);

  useEffect(() => {
    if (!tripId || !eventId) {
      setDetail(null);
      setError(null);
      setSelectedPlanId(null);
      setPreferenceStrength(3);
      return;
    }
    reload();
  }, [tripId, eventId, reload]);

  const vote = useCallback(async () => {
    if (!tripId || !eventId || !selectedPlanId) return;
    try {
      setVoting(true);
      await inTripExecutionApi.voteEnvironmentEvent(tripId, eventId, {
        planId: selectedPlanId,
        preferenceStrength,
      });
      toast.success('投票已提交');
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '投票失败');
    } finally {
      setVoting(false);
    }
  }, [tripId, eventId, selectedPlanId, preferenceStrength, reload]);

  const resolve = useCallback(
    async (planId?: string) => {
      if (!tripId || !eventId) return;
      try {
        setResolving(true);
        const result = await inTripExecutionApi.resolveEnvironmentEvent(
          tripId,
          eventId,
          planId ? { planId } : undefined,
        );
        setDetail(result);
        toast.success('方案已锁定');
        void submitInTripCausalTelemetryForEnvironmentEvent(tripId, result).catch((error) => {
          console.warn('[useInTripEnvironmentEvent] causal telemetry skipped', error);
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '锁定方案失败');
      } finally {
        setResolving(false);
      }
    },
    [tripId, eventId],
  );

  return {
    detail,
    loading,
    error,
    voting,
    resolving,
    selectedPlanId,
    setSelectedPlanId,
    preferenceStrength,
    setPreferenceStrength,
    reload,
    vote,
    resolve,
  };
}
