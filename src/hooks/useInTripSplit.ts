import { useCallback, useEffect, useState } from 'react';
import { inTripSplitApi } from '@/api/in-trip-split';
import type { SplitPartySessionDetail, SplitPartySessionSummary } from '@/types/in-trip-split';

export function useInTripSplitSessions(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [sessions, setSessions] = useState<SplitPartySessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripSplitApi.listSessions(tripId);
      setSessions(result);
    } catch (e) {
      setSessions([]);
      setError(e instanceof Error ? e.message : '加载分组记录失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setSessions([]);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  const propose = useCallback(async () => {
    if (!tripId) return null;
    try {
      setProposing(true);
      const detail = await inTripSplitApi.propose(tripId, { triggerReason: 'manual_propose' });
      await reload();
      return detail;
    } finally {
      setProposing(false);
    }
  }, [tripId, reload]);

  const execute = useCallback(
    async (sessionId: string) => {
      if (!tripId) return null;
      try {
        setExecutingId(sessionId);
        const detail = await inTripSplitApi.executeSession(tripId, sessionId);
        await reload();
        return detail;
      } finally {
        setExecutingId(null);
      }
    },
    [tripId, reload],
  );

  const activeSession = sessions.find((s) => s.status === 'active') ?? null;
  const proposedSessions = sessions.filter((s) => s.status === 'proposed');

  return {
    sessions,
    activeSession,
    proposedSessions,
    loading,
    error,
    proposing,
    executingId,
    reload,
    propose,
    execute,
  };
}

export function useInTripSplitSession(
  tripId: string | null | undefined,
  sessionId: string | null | undefined,
) {
  const [detail, setDetail] = useState<SplitPartySessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripSplitApi.getSession(tripId, sessionId);
      setDetail(result);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : '加载分组详情失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, sessionId]);

  useEffect(() => {
    if (!tripId || !sessionId) {
      setDetail(null);
      return;
    }
    reload();
  }, [tripId, sessionId, reload]);

  return { detail, loading, error, reload };
}
