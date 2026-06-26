import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { processFairnessApi } from '@/api/process-fairness';
import type {
  PreferenceRoundDetail,
  SubmitHeardVotesRequest,
  SubmitUtteranceRequest,
} from '@/types/process-fairness';

export function usePreferenceRound(
  tripId: string | undefined,
  roundId: string | null | undefined,
  options?: { pollIntervalMs?: number; enabled?: boolean },
) {
  const [detail, setDetail] = useState<PreferenceRoundDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(tripId && roundId));
  const [submitting, setSubmitting] = useState(false);
  const pollIntervalMs = options?.pollIntervalMs ?? 8000;
  const enabled = options?.enabled !== false;

  const reload = useCallback(async () => {
    if (!tripId || !roundId) {
      setDetail(null);
      return null;
    }
    try {
      setLoading(true);
      const data = await processFairnessApi.getRoundDetail(tripId, roundId);
      setDetail(data);
      return data;
    } catch (e) {
      toast.error((e as Error).message ?? '加载讨论区失败');
      setDetail(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, roundId]);

  useEffect(() => {
    if (!enabled || !tripId || !roundId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, tripId, roundId, reload]);

  const shouldPoll = detail?.status === 'collecting' || detail?.status === 'synthesizing';
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !tripId || !roundId || !shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      void reload();
    }, pollIntervalMs);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, tripId, roundId, shouldPoll, pollIntervalMs, reload]);

  const submitUtterance = useCallback(
    async (body: SubmitUtteranceRequest) => {
      if (!tripId || !roundId) return null;
      try {
        setSubmitting(true);
        const data = await processFairnessApi.submitUtterance(tripId, roundId, body);
        setDetail(data);
        return data;
      } catch (e) {
        toast.error((e as Error).message ?? '提交发言失败');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, roundId],
  );

  const submitHeardVotes = useCallback(
    async (body: SubmitHeardVotesRequest) => {
      if (!tripId || !roundId) return null;
      try {
        setSubmitting(true);
        const data = await processFairnessApi.submitHeardVotes(tripId, roundId, body);
        setDetail(data);
        return data;
      } catch (e) {
        toast.error((e as Error).message ?? '提交投票失败');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, roundId],
  );

  const closeRound = useCallback(async () => {
    if (!tripId || !roundId) return null;
    try {
      setSubmitting(true);
      const data = await processFairnessApi.closeRound(tripId, roundId);
      setDetail(data);
      return data;
    } catch (e) {
      toast.error((e as Error).message ?? '结束轮次失败');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [tripId, roundId]);

  return {
    detail,
    loading,
    submitting,
    reload,
    submitUtterance,
    submitHeardVotes,
    closeRound,
  };
}
