import { useCallback, useEffect, useState } from 'react';
import { ctreApi } from '../api/client';
import type { CtreCompileProgressView } from '../types';

export type UseCtreCompileProgressOptions = {
  /**
   * - `offline`：Trip 详情单次加载（Graph 已落库）
   * - `poll-fallback`：生成中静默轮询；404/空数据不报错
   */
  purpose?: 'offline' | 'poll-fallback';
  /** poll-fallback：active 且存在 tripId 时为 true */
  pollWhile?: boolean;
  pollIntervalMs?: number;
  /** 为 false 时不发起 HTTP（如无 trip_id 草稿仅 SSE） */
  enabled?: boolean;
};

export function useCtreCompileProgress(
  tripId: string | null | undefined,
  options?: UseCtreCompileProgressOptions,
) {
  const purpose = options?.purpose ?? 'offline';
  const pollWhile = options?.pollWhile ?? false;
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const enabled = options?.enabled ?? true;

  const [progress, setProgress] = useState<CtreCompileProgressView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphNotFound, setGraphNotFound] = useState(false);

  const fetchOnce = useCallback(
    async (silent = false): Promise<CtreCompileProgressView | null> => {
      if (!tripId || !enabled) {
        setProgress(null);
        setGraphNotFound(false);
        return null;
      }
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      try {
        const res = await ctreApi.getCompileProgress(tripId);
        setGraphNotFound(res.notFound);
        setProgress(res.progress);
        if (res.notFound) setError(null);
        return res.progress;
      } catch (err) {
        if (purpose === 'poll-fallback' || silent) {
          return null;
        }
        setError(err instanceof Error ? err.message : '加载 CTRE 编译进度失败');
        setProgress(null);
        setGraphNotFound(false);
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [tripId, enabled, purpose],
  );

  useEffect(() => {
    if (!enabled) {
      setProgress(null);
      setGraphNotFound(false);
      setError(null);
      setLoading(false);
      return;
    }
    if (purpose === 'poll-fallback' && pollWhile) {
      void fetchOnce(true);
      return;
    }
    void fetchOnce(false);
  }, [enabled, purpose, pollWhile, fetchOnce]);

  useEffect(() => {
    if (!pollWhile || !tripId || !enabled || purpose !== 'poll-fallback') return;
    const timer = window.setInterval(() => {
      void fetchOnce(true);
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [pollWhile, tripId, pollIntervalMs, fetchOnce, enabled, purpose]);

  const reload = useCallback(() => fetchOnce(false), [fetchOnce]);

  return { progress, loading, error, graphNotFound, reload };
}
