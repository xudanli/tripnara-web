import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { decisionCheckerApi, DecisionCheckerApiError } from '@/api/decision-checker';
import { invalidateWorkbenchPlanningConflicts } from '@/pages/plan-studio/hooks/useWorkbenchData';
import type {
  DecisionCheckerQuery,
  DecisionCheckerRefreshRequest,
  DecisionCheckerResponse,
} from '@/types/decision-checker';
import { normalizeDecisionCheckerResponse } from '@/types/decision-checker';

export type DecisionCheckerSource = 'dedicated' | 'planning_conflicts_embed' | null;

export interface UseDecisionCheckerOptions {
  enabled?: boolean;
  focusConflictId?: string | null;
  constraintsVersion?: number | null;
  embeddedSnapshot?: DecisionCheckerResponse | null;
  /** 首包 planning-conflicts 仍在加载 */
  embeddedLoading?: boolean;
  /** decisionChecker deferred 轮询中（conflicts 已就绪） */
  awaitingDeferred?: boolean;
  deferredError?: string | null;
  embeddedMode?: boolean;
}

export interface UseDecisionCheckerResult {
  data: DecisionCheckerResponse | null;
  source: DecisionCheckerSource;
  loading: boolean;
  awaitingEmbedded: boolean;
  refreshing: boolean;
  error: string | null;
  unavailable: boolean;
  reload: () => Promise<void>;
  refresh: (body?: DecisionCheckerRefreshRequest) => Promise<void>;
}

export function useDecisionChecker(
  tripId: string | null | undefined,
  options: UseDecisionCheckerOptions = {},
): UseDecisionCheckerResult {
  const enabled = options.enabled !== false && Boolean(tripId);
  const queryClient = useQueryClient();
  const useEmbedded = options.embeddedMode === true;

  const embeddedData = useMemo(
    () =>
      tripId && options.embeddedSnapshot
        ? normalizeDecisionCheckerResponse(options.embeddedSnapshot, tripId)
        : null,
    [tripId, options.embeddedSnapshot],
  );

  const [dedicatedData, setDedicatedData] = useState<DecisionCheckerResponse | null>(null);
  const [source, setSource] = useState<DecisionCheckerSource>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const buildQuery = useCallback((): DecisionCheckerQuery | undefined => {
    const query: DecisionCheckerQuery = {};
    if (options.focusConflictId) query.focusConflictId = options.focusConflictId;
    if (options.constraintsVersion != null) query.constraintsVersion = options.constraintsVersion;
    return Object.keys(query).length > 0 ? query : undefined;
  }, [options.focusConflictId, options.constraintsVersion]);

  const reloadDedicated = useCallback(async () => {
    if (!tripId || !enabled) return;

    setLoading(true);
    setError(null);
    setUnavailable(false);

    try {
      const response = await decisionCheckerApi.get(tripId, buildQuery());
      setDedicatedData(normalizeDecisionCheckerResponse(response, tripId));
      setSource('dedicated');
    } catch (e) {
      if (e instanceof DecisionCheckerApiError && e.code === 'NOT_FOUND') {
        setDedicatedData(null);
        setSource(null);
        setUnavailable(true);
        setError(null);
      } else {
        setDedicatedData(null);
        setSource(null);
        setError(e instanceof Error ? e.message : '加载决策检查器失败');
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled, buildQuery]);

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;

    if (useEmbedded) {
      await invalidateWorkbenchPlanningConflicts(queryClient, tripId);
      return;
    }

    await reloadDedicated();
  }, [tripId, enabled, useEmbedded, queryClient, reloadDedicated]);

  const pollRefreshTask = useCallback(
    async (taskId: string) => {
      if (!tripId) return;
      const maxAttempts = 12;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => {
          pollTimerRef.current = setTimeout(resolve, 1500);
        });
        try {
          const response = await decisionCheckerApi.get(tripId, { ...buildQuery(), taskId });
          const normalized = normalizeDecisionCheckerResponse(response, tripId);
          if (useEmbedded) {
            await invalidateWorkbenchPlanningConflicts(queryClient, tripId);
          } else {
            setDedicatedData(normalized);
            setSource('dedicated');
          }
          setError(null);
          setUnavailable(false);
          return;
        } catch (e) {
          if (e instanceof DecisionCheckerApiError && e.code === 'NOT_FOUND') continue;
          throw e;
        }
      }
      setError('决策检查器刷新超时，请稍后重试');
    },
    [tripId, buildQuery, useEmbedded, queryClient],
  );

  const refresh = useCallback(
    async (body?: DecisionCheckerRefreshRequest) => {
      if (!tripId) return;
      clearPoll();
      setRefreshing(true);
      setError(null);
      try {
        const accepted = await decisionCheckerApi.refresh(tripId, {
          ...body,
          focusConflictId: body?.focusConflictId ?? options.focusConflictId ?? undefined,
          constraintsVersion: body?.constraintsVersion ?? options.constraintsVersion ?? undefined,
        });
        await pollRefreshTask(accepted.taskId);
      } catch (e) {
        setError(e instanceof Error ? e.message : '刷新决策检查器失败');
      } finally {
        setRefreshing(false);
      }
    },
    [tripId, clearPoll, pollRefreshTask, options.focusConflictId, options.constraintsVersion],
  );

  useEffect(() => {
    if (useEmbedded || !enabled) return;
    void reloadDedicated();
  }, [useEmbedded, enabled, reloadDedicated]);

  useEffect(() => () => clearPoll(), [clearPoll]);

  const data = useEmbedded ? embeddedData : dedicatedData;

  const resolvedSource: DecisionCheckerSource = useEmbedded
    ? embeddedData
      ? 'planning_conflicts_embed'
      : null
    : source;

  const hasData = Boolean(data);
  const awaitingConflicts = useEmbedded && Boolean(options.embeddedLoading);
  const awaitingDeferred =
    useEmbedded && !hasData && Boolean(options.awaitingDeferred) && !awaitingConflicts;

  const resolvedLoading = useEmbedded
    ? awaitingConflicts || awaitingDeferred
    : loading;

  return {
    data,
    source: resolvedSource,
    loading: resolvedLoading,
    awaitingEmbedded: awaitingDeferred,
    refreshing,
    error: hasData ? error : (options.deferredError ?? error),
    unavailable: useEmbedded
      ? !hasData &&
        !resolvedLoading &&
        !options.embeddedLoading &&
        !options.awaitingDeferred &&
        Boolean(options.deferredError)
      : unavailable,
    reload,
    refresh,
  };
}
