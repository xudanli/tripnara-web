import { useCallback, useEffect, useState } from 'react';
import { inTripPulseApi } from '@/api/in-trip-pulse';
import type {
  MemberStateVector,
  PulseIntervention,
  TeamThermometerData,
} from '@/types/in-trip-pulse';

export function useInTripPulseThermometer(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [data, setData] = useState<TeamThermometerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripPulseApi.getTeamThermometer(tripId);
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '加载团队温度计失败');
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

  return { data, loading, error, reload };
}

export function useInTripPulseInterventions(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [interventions, setInterventions] = useState<PulseIntervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackingId, setAckingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripPulseApi.listInterventions(tripId);
      setInterventions(result.filter((i) => i.status === 'pending'));
    } catch (e) {
      setInterventions([]);
      setError(e instanceof Error ? e.message : '加载干预建议失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setInterventions([]);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  const ack = useCallback(
    async (interventionId: string, action: 'acknowledge' | 'dismiss') => {
      if (!tripId) return;
      try {
        setAckingId(interventionId);
        await inTripPulseApi.ackIntervention(tripId, interventionId, action);
        await reload();
      } finally {
        setAckingId(null);
      }
    },
    [tripId, reload],
  );

  return { interventions, loading, error, ackingId, reload, ack };
}

export function useInTripPulseMyState(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [state, setState] = useState<MemberStateVector | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      const result = await inTripPulseApi.getMyState(tripId);
      setState(result);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setState(null);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  return { state, loading, reload };
}
