import { useCallback, useEffect, useState } from 'react';
import {
  inTripExperienceApi,
  isExperienceLoopDisabledError,
} from '@/api/in-trip-experience';
import type {
  ExperiencePulseInput,
  ExperiencePulseListResult,
  ExperiencePulseSummary,
  ExperiencePulseTrigger,
  PostTripSummary,
  WeightAdjustmentsResult,
} from '@/types/in-trip-experience';

export function useInTripExperiencePending(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [triggers, setTriggers] = useState<ExperiencePulseTrigger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      setDisabled(false);
      const result = await inTripExperienceApi.getPending(tripId);
      setTriggers(result);
    } catch (e) {
      console.error('[useInTripExperiencePending] load failed', e);
      setTriggers([]);
      if (isExperienceLoopDisabledError(e)) {
        setDisabled(true);
        setError('体验闭环尚未启用');
        return;
      }
      setError(e instanceof Error ? e.message : '加载微调查触发器失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setTriggers([]);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  const submit = useCallback(
    async (body: ExperiencePulseInput): Promise<ExperiencePulseSummary> => {
      if (!tripId) throw new Error('缺少行程 ID');
      const result = await inTripExperienceApi.submitPulse(tripId, body);
      await reload();
      return result;
    },
    [tripId, reload],
  );

  return { triggers, loading, error, disabled, reload, submit };
}

export function useInTripExperiencePulseHistory(
  tripId: string | null | undefined,
  enabled = true,
  params?: { limit?: number; offset?: number },
) {
  const [data, setData] = useState<ExperiencePulseListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripExperienceApi.listPulses(tripId, params);
      setData(result);
    } catch (e) {
      console.error('[useInTripExperiencePulseHistory] load failed', e);
      setData(null);
      setError(e instanceof Error ? e.message : '加载微调查历史失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled, params?.limit, params?.offset]);

  useEffect(() => {
    if (!tripId || !enabled) {
      setData(null);
      return;
    }
    reload();
  }, [tripId, enabled, reload]);

  return { data, loading, error, reload };
}

export function useInTripExperienceWeights(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [data, setData] = useState<WeightAdjustmentsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripExperienceApi.getWeightAdjustments(tripId);
      setData(result);
    } catch (e) {
      console.error('[useInTripExperienceWeights] load failed', e);
      setData(null);
      setError(e instanceof Error ? e.message : '加载推荐权重变更失败');
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

  const markRead = useCallback(async () => {
    if (!tripId) return;
    try {
      setMarkingRead(true);
      await inTripExperienceApi.markWeightAdjustmentsRead(tripId);
      await reload();
    } finally {
      setMarkingRead(false);
    }
  }, [tripId, reload]);

  const unreadCount = data?.history.filter((h) => h.unread).length ?? 0;

  return { data, loading, error, unreadCount, markingRead, reload, markRead };
}

export function useInTripPostTripSummary(
  tripId: string | null | undefined,
  enabled = true,
) {
  const [data, setData] = useState<PostTripSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await inTripExperienceApi.getPostTripSummary(tripId);
      setData(result);
    } catch (e) {
      console.error('[useInTripPostTripSummary] load failed', e);
      setData(null);
      setError(e instanceof Error ? e.message : '加载行后总结失败');
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
