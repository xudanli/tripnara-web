import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { silentVotesApi } from '@/api/silent-votes';
import type {
  CreateSilentVoteFromCompareRequest,
  CreateSilentVoteRequest,
  SilentVoteDetail,
  SilentVoteIntensity,
  SubmitSilentVoteBallotRequest,
} from '@/types/silent-votes';

export function useSilentVoteList(tripId: string | null | undefined) {
  const [items, setItems] = useState<SilentVoteDetail[]>([]);
  const [loading, setLoading] = useState(!!tripId);

  const reload = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const res = await silentVotesApi.list(tripId);
      setItems(res.items);
    } catch (e) {
      toast.error((e as Error).message ?? '加载投票列表失败');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, reload };
}

export function useSilentVoteDetail(
  tripId: string | null | undefined,
  voteId: string | null | undefined,
  options?: { pollWhenOpen?: boolean; pollIntervalMs?: number },
) {
  const [detail, setDetail] = useState<SilentVoteDetail | null>(null);
  const [loading, setLoading] = useState(!!tripId && !!voteId);
  const [submitting, setSubmitting] = useState(false);
  const pollWhenOpen = options?.pollWhenOpen ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? 8000;

  const reload = useCallback(async () => {
    if (!tripId || !voteId) return null;
    try {
      setLoading(true);
      const data = await silentVotesApi.getDetail(tripId, voteId);
      setDetail(data);
      return data;
    } catch (e) {
      toast.error((e as Error).message ?? '加载投票详情失败');
      setDetail(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, voteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!pollWhenOpen || !tripId || !voteId || detail?.status !== 'open') return;
    const timer = window.setInterval(() => {
      void silentVotesApi.getDetail(tripId, voteId).then(setDetail).catch(() => {});
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [pollWhenOpen, pollIntervalMs, tripId, voteId, detail?.status]);

  const submitBallot = useCallback(
    async (body: SubmitSilentVoteBallotRequest) => {
      if (!tripId || !voteId) return;
      setSubmitting(true);
      try {
        await silentVotesApi.submitBallot(tripId, voteId, body);
        const next = await silentVotesApi.getDetail(tripId, voteId);
        setDetail(next);
        toast.success('选票已提交');
        return next;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [tripId, voteId],
  );

  const openVote = useCallback(async () => {
    if (!tripId || !voteId) return;
    setSubmitting(true);
    try {
      const next = await silentVotesApi.open(tripId, voteId);
      setDetail(next);
      toast.success('投票已开放');
      return next;
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [tripId, voteId]);

  const closeVote = useCallback(async () => {
    if (!tripId || !voteId) return;
    setSubmitting(true);
    try {
      const next = await silentVotesApi.close(tripId, voteId);
      setDetail(next);
      toast.success('投票已关闭');
      return next;
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [tripId, voteId]);

  return {
    detail,
    loading,
    submitting,
    reload,
    submitBallot,
    openVote,
    closeVote,
  };
}

export function useCreateSilentVote(tripId: string) {
  const [creating, setCreating] = useState(false);

  const createFromCompare = useCallback(
    async (body: CreateSilentVoteFromCompareRequest) => {
      setCreating(true);
      try {
        const vote = await silentVotesApi.createFromCompare(tripId, body);
        toast.success('匿名投票已发起');
        return vote;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [tripId],
  );

  const createManual = useCallback(
    async (body: CreateSilentVoteRequest) => {
      setCreating(true);
      try {
        const vote = await silentVotesApi.create(tripId, body);
        toast.success('投票已创建');
        return vote;
      } catch (e) {
        toast.error((e as Error).message);
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [tripId],
  );

  return { creating, createFromCompare, createManual };
}

/** 预填选票：优先 mine 接口，fallback 到 detail.myBallotSubmitted */
export function useSilentVoteBallotPrefill(
  tripId: string | null | undefined,
  voteId: string | null | undefined,
  detail: SilentVoteDetail | null,
) {
  const [optionId, setOptionId] = useState('');
  const [intensity, setIntensity] = useState<SilentVoteIntensity>(3);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tripId || !voteId) return;
    const key = `${tripId}:${voteId}`;
    if (loadedRef.current === key) return;

    void silentVotesApi
      .getMyBallot(tripId, voteId)
      .then((res) => {
        loadedRef.current = key;
        if (res.submitted && res.ballot) {
          setOptionId(res.ballot.optionId);
          setIntensity(res.ballot.intensity);
        } else if (detail?.options.length) {
          setOptionId(detail.options[0].id);
        }
      })
      .catch(() => {
        if (detail?.options.length) setOptionId(detail.options[0].id);
      });
  }, [tripId, voteId, detail?.options]);

  return { optionId, setOptionId, intensity, setIntensity };
}
