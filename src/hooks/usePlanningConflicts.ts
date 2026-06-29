import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { decisionCheckerApi, DecisionCheckerApiError } from '@/api/decision-checker';
import { tripConstraintSolverApi } from '@/api/trip-constraint-solver';
import { tripsApi } from '@/api/trips';
import { computeGateExecuteStatus } from '@/lib/gate-execute';
import { setDecisionCheckerDeferredReady, getDecisionCheckerDeferredSnapshot, discardStaleDecisionCheckerDeferred } from '@/lib/decision-checker-deferred.store';
import {
  DEFERRED_DEDICATED_PARALLEL_MS,
  DEFERRED_TASK_STALE_MS,
  PLANNING_CONFLICTS_BFF_SOFT_TIMEOUT_MS,
  shouldUsePlanningConflictsLegacyFallback,
} from '@/lib/planning-conflicts-fallback.util';
import { subscribeDebouncedConstraintsRevalidate } from '@/lib/plan-studio-constraints-events';
import {
  computePlanningConflictsInboxMetrics,
  enrichPlanningConflictItems,
  mergePlanningConflicts,
  summarizePlanningConflicts,
  type PlanningConflictItem,
  type PlanningConflictSummary,
  type PlanningConflictsInboxMetrics,
} from '@/lib/planning-conflicts.util';
import {
  invalidateWorkbenchAfterConstraintChange,
  invalidateWorkbenchPlanningConflicts,
  useWorkbenchPlanningConflicts,
} from '@/pages/plan-studio/hooks/useWorkbenchData';
import { useDecisionCheckerDeferred } from '@/hooks/useDecisionCheckerDeferred';
import type { DecisionCheckerQuery, DecisionCheckerResponse } from '@/types/decision-checker';
import { normalizeDecisionCheckerResponse } from '@/types/decision-checker';
import type { PlanningConflictsResponse } from '@/types/planning-conflicts';
import type { ConstraintsSummaryResponse } from '@/types/planning-constraints';
import type { FeasibilityReportValidateOptions } from '@/types/trip-feasibility-report';
import type { GateExecuteStatus } from '@/types/trip-reservation-evidence';

export type PlanningConflictsSource = 'bff' | 'legacy';

export interface UsePlanningConflictsResult {
  source: PlanningConflictsSource | null;
  bundle: PlanningConflictsResponse | null;
  items: PlanningConflictItem[];
  summary: PlanningConflictSummary;
  gateExecute: GateExecuteStatus;
  isStale: boolean;
  verdictHeadline?: string;
  loading: boolean;
  decisionCheckerLoading: boolean;
  decisionCheckerError: string | null;
  /** legacy / fallback 路径下 dedicated GET decision-checker 结果 */
  decisionChecker: DecisionCheckerResponse | null;
  /** 已启用 /conflicts + /decision-checker fallback */
  usingFallback: boolean;
  error: string | null;
  reload: () => Promise<void>;
  revalidateAndReload: (options?: FeasibilityReportValidateOptions) => Promise<void>;
  inbox: PlanningConflictsInboxMetrics;
  constraintsSummary: ConstraintsSummaryResponse | null;
}

function emptyGate(): GateExecuteStatus {
  return { blocked: false, reasons: [] };
}

const EMPTY_SUMMARY: PlanningConflictSummary = {
  total: 0,
  mustHandle: 0,
  suggestAdjust: 0,
  pendingConfirm: 0,
  byCategory: {},
};

async function loadLegacyConflictsQuick(tripId: string): Promise<{
  items: PlanningConflictItem[];
  summary: PlanningConflictSummary;
}> {
  const conflictsRes = await tripsApi.getConflicts(tripId);
  const items = enrichPlanningConflictItems(
    mergePlanningConflicts(undefined, conflictsRes.conflicts),
  );
  return {
    items,
    summary: summarizePlanningConflicts(items),
  };
}

async function loadLegacyMerged(tripId: string): Promise<{
  items: PlanningConflictItem[];
  summary: PlanningConflictSummary;
  gateExecute: GateExecuteStatus;
  isStale: boolean;
  verdictHeadline?: string;
}> {
  const [report, conflictsRes] = await Promise.all([
    tripConstraintSolverApi.getFeasibilityReport(tripId),
    tripsApi.getConflicts(tripId),
  ]);
  const items = enrichPlanningConflictItems(
    mergePlanningConflicts(report?.issues, conflictsRes.conflicts),
  );
  const gateExecute =
    report?.gateExecute ?? computeGateExecuteStatus(report, null);
  return {
    items,
    summary: summarizePlanningConflicts(items),
    gateExecute,
    isStale: Boolean(report?.isStale),
    verdictHeadline: report?.verdict?.headline ?? report?.verdict?.status,
  };
}

function buildDecisionCheckerQuery(
  focusConflictId?: string | null,
  constraintsVersion?: number | null,
): DecisionCheckerQuery | undefined {
  const query: DecisionCheckerQuery = {};
  if (focusConflictId) query.focusConflictId = focusConflictId;
  if (constraintsVersion != null) query.constraintsVersion = constraintsVersion;
  return Object.keys(query).length > 0 ? query : undefined;
}

export function usePlanningConflicts(
  tripId: string | null | undefined,
  options?: {
    includeDecisionChecker?: boolean;
    focusConflictId?: string | null;
    constraintsVersion?: number | null;
  },
): UsePlanningConflictsResult {
  const includeDecisionChecker = options?.includeDecisionChecker ?? true;
  const queryClient = useQueryClient();
  const bffQuery = useWorkbenchPlanningConflicts(tripId, {
    includeDecisionChecker,
    focusConflictId: options?.focusConflictId ?? null,
    constraintsVersion: options?.constraintsVersion ?? null,
  });
  const deferredStore = useDecisionCheckerDeferred(tripId);

  const [legacyItems, setLegacyItems] = useState<PlanningConflictItem[]>([]);
  const [legacySummary, setLegacySummary] = useState<PlanningConflictSummary>(EMPTY_SUMMARY);
  const [legacyGate, setLegacyGate] = useState<GateExecuteStatus>(emptyGate());
  const [legacyStale, setLegacyStale] = useState(false);
  const [legacyVerdict, setLegacyVerdict] = useState<string | undefined>();
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const legacyAttemptedRef = useRef<string | null>(null);

  const [forceLegacyFallback, setForceLegacyFallback] = useState(false);
  const bffFetchStartedAtRef = useRef<number | null>(null);
  const fallbackToastShownRef = useRef(false);

  const [fallbackDecisionChecker, setFallbackDecisionChecker] =
    useState<DecisionCheckerResponse | null>(null);
  const [fallbackDecisionCheckerLoading, setFallbackDecisionCheckerLoading] = useState(false);
  const [fallbackDecisionCheckerError, setFallbackDecisionCheckerError] = useState<string | null>(
    null,
  );
  const fallbackDecisionCheckerKeyRef = useRef<string | null>(null);
  const deferredDedicatedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredStaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bffFailedFallback =
    Boolean(tripId) &&
    bffQuery.isError &&
    shouldUsePlanningConflictsLegacyFallback(bffQuery.error) &&
    !bffQuery.isFetching;

  const useLegacy = Boolean(tripId) && (forceLegacyFallback || bffFailedFallback);
  const usingFallback = useLegacy;

  useEffect(() => {
    if (bffQuery.isFetching) {
      if (bffFetchStartedAtRef.current == null) {
        bffFetchStartedAtRef.current = Date.now();
      }
      return;
    }

    bffFetchStartedAtRef.current = null;
    if (bffQuery.isSuccess) {
      setForceLegacyFallback(false);
    }
  }, [bffQuery.isFetching, bffQuery.isSuccess]);

  useEffect(() => {
    if (!tripId || !bffQuery.isFetching || forceLegacyFallback) return;

    const startedAt = bffFetchStartedAtRef.current ?? Date.now();
    const delayMs = Math.max(0, PLANNING_CONFLICTS_BFF_SOFT_TIMEOUT_MS - (Date.now() - startedAt));
    const timer = setTimeout(() => {
      if (!bffQuery.isFetching) return;
      setForceLegacyFallback(true);
      if (!fallbackToastShownRef.current) {
        fallbackToastShownRef.current = true;
        toast.info('规划冲突聚合较慢，正在改用快速接口加载…');
        setTimeout(() => {
          fallbackToastShownRef.current = false;
        }, 8000);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [tripId, bffQuery.isFetching, forceLegacyFallback]);

  useEffect(() => {
    if (!useLegacy) {
      legacyAttemptedRef.current = null;
    }
  }, [useLegacy]);

  useEffect(() => {
    if (!tripId || !useLegacy) return;

    const attemptKey = `${tripId}:${options?.focusConflictId ?? ''}`;
    if (legacyAttemptedRef.current === attemptKey) return;
    legacyAttemptedRef.current = attemptKey;

    let cancelled = false;
    setLegacyLoading(true);
    setLegacyError(null);

    void loadLegacyConflictsQuick(tripId)
      .then((quick) => {
        if (cancelled) return;
        setLegacyItems(quick.items);
        setLegacySummary(quick.summary);
        setLegacyLoading(false);
      })
      .catch((quickError) => {
        if (cancelled) return;
        setLegacyItems([]);
        setLegacyError(
          quickError instanceof Error ? quickError.message : '加载规划冲突失败',
        );
        setLegacyLoading(false);
      });

    void loadLegacyMerged(tripId)
      .then((legacy) => {
        if (cancelled) return;
        setLegacyItems(legacy.items);
        setLegacySummary(legacy.summary);
        setLegacyGate(legacy.gateExecute);
        setLegacyStale(legacy.isStale);
        setLegacyVerdict(legacy.verdictHeadline);
        setLegacyError(null);
      })
      .catch((legacyLoadError) => {
        if (cancelled) return;
        console.warn('[usePlanningConflicts] feasibility enrich failed', legacyLoadError);
      })
      .finally(() => {
        if (!cancelled) setLegacyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, useLegacy, options?.focusConflictId]);

  const loadDedicatedDecisionChecker = useCallback(
    (reason: 'legacy' | 'deferred-fail' | 'deferred-pending') => {
      if (!tripId || !includeDecisionChecker) return;

      const loadKey = `${tripId}:${options?.focusConflictId ?? ''}:${options?.constraintsVersion ?? ''}:${reason}`;
      if (fallbackDecisionCheckerKeyRef.current === loadKey) return;
      fallbackDecisionCheckerKeyRef.current = loadKey;

      setFallbackDecisionCheckerLoading(true);
      setFallbackDecisionCheckerError(null);

      void decisionCheckerApi
        .get(tripId, buildDecisionCheckerQuery(options?.focusConflictId, options?.constraintsVersion))
        .then((response) => {
          const normalized = normalizeDecisionCheckerResponse(response, tripId);
          setFallbackDecisionChecker(normalized);
          setFallbackDecisionCheckerError(null);
          if (!useLegacy) {
            setDecisionCheckerDeferredReady(tripId, normalized);
          }
        })
        .catch((err) => {
          setFallbackDecisionChecker(null);
          if (err instanceof DecisionCheckerApiError && err.code === 'NOT_FOUND') {
            setFallbackDecisionCheckerError(null);
            return;
          }
          setFallbackDecisionCheckerError(
            err instanceof Error ? err.message : '加载决策检查器失败',
          );
        })
        .finally(() => {
          setFallbackDecisionCheckerLoading(false);
        });
    },
    [
      tripId,
      includeDecisionChecker,
      useLegacy,
      options?.focusConflictId,
      options?.constraintsVersion,
    ],
  );

  useEffect(() => {
    if (!tripId || !includeDecisionChecker) {
      if (deferredDedicatedTimerRef.current) {
        clearTimeout(deferredDedicatedTimerRef.current);
        deferredDedicatedTimerRef.current = null;
      }
      return;
    }

    if (useLegacy) {
      loadDedicatedDecisionChecker('legacy');
      return;
    }

    if (deferredStore.error && !deferredStore.decisionChecker && bffQuery.data) {
      loadDedicatedDecisionChecker('deferred-fail');
    }
  }, [
    tripId,
    includeDecisionChecker,
    useLegacy,
    deferredStore.error,
    deferredStore.decisionChecker,
    bffQuery.data,
    loadDedicatedDecisionChecker,
  ]);

  useEffect(() => {
    if (deferredStaleTimerRef.current) {
      clearTimeout(deferredStaleTimerRef.current);
      deferredStaleTimerRef.current = null;
    }

    if (
      !tripId ||
      !includeDecisionChecker ||
      useLegacy ||
      deferredStore.decisionChecker ||
      !deferredStore.loading ||
      !deferredStore.taskId ||
      !deferredStore.pendingSinceMs
    ) {
      return;
    }

    const elapsed = Date.now() - deferredStore.pendingSinceMs;
    const delayMs = Math.max(0, DEFERRED_TASK_STALE_MS - elapsed);
    deferredStaleTimerRef.current = setTimeout(() => {
      deferredStaleTimerRef.current = null;
      if (!discardStaleDecisionCheckerDeferred(tripId)) return;
      void invalidateWorkbenchPlanningConflicts(queryClient, tripId);
    }, delayMs);

    return () => {
      if (deferredStaleTimerRef.current) {
        clearTimeout(deferredStaleTimerRef.current);
        deferredStaleTimerRef.current = null;
      }
    };
  }, [
    tripId,
    includeDecisionChecker,
    useLegacy,
    queryClient,
    deferredStore.decisionChecker,
    deferredStore.loading,
    deferredStore.taskId,
    deferredStore.pendingSinceMs,
  ]);

  useEffect(() => {
    if (deferredDedicatedTimerRef.current) {
      clearTimeout(deferredDedicatedTimerRef.current);
      deferredDedicatedTimerRef.current = null;
    }

    if (
      !tripId ||
      !includeDecisionChecker ||
      useLegacy ||
      !bffQuery.data ||
      deferredStore.decisionChecker ||
      !deferredStore.loading ||
      !deferredStore.taskId
    ) {
      return;
    }

    deferredDedicatedTimerRef.current = setTimeout(() => {
      deferredDedicatedTimerRef.current = null;
      if (getDecisionCheckerDeferredSnapshot(tripId).decisionChecker) return;
      loadDedicatedDecisionChecker('deferred-pending');
    }, DEFERRED_DEDICATED_PARALLEL_MS);

    return () => {
      if (deferredDedicatedTimerRef.current) {
        clearTimeout(deferredDedicatedTimerRef.current);
        deferredDedicatedTimerRef.current = null;
      }
    };
  }, [
    tripId,
    includeDecisionChecker,
    useLegacy,
    bffQuery.data,
    deferredStore.decisionChecker,
    deferredStore.loading,
    deferredStore.taskId,
    loadDedicatedDecisionChecker,
  ]);

  const reload = useCallback(async () => {
    if (!tripId) return;
    legacyAttemptedRef.current = null;
    setLegacyItems([]);
    setLegacyError(null);
    setForceLegacyFallback(false);
    bffFetchStartedAtRef.current = null;
    fallbackDecisionCheckerKeyRef.current = null;
    setFallbackDecisionChecker(null);
    setFallbackDecisionCheckerError(null);
    await invalidateWorkbenchPlanningConflicts(queryClient, tripId);
  }, [tripId, queryClient]);

  const revalidateAndReload = useCallback(
    async (options?: FeasibilityReportValidateOptions) => {
      if (!tripId) return;
      await tripConstraintSolverApi.revalidateFullTrip(tripId, options);
      await invalidateWorkbenchAfterConstraintChange(queryClient, tripId);
    },
    [tripId, queryClient],
  );

  const revalidateToastShown = useRef(false);

  useEffect(() => {
    if (!tripId) return;
    return subscribeDebouncedConstraintsRevalidate({
      tripId,
      debounceMs: 2000,
      revalidate: async () => {
        if (!revalidateToastShown.current) {
          revalidateToastShown.current = true;
          toast.info('约束已更新，正在重新检查可执行性…');
          setTimeout(() => {
            revalidateToastShown.current = false;
          }, 5000);
        }
        try {
          await tripConstraintSolverApi.revalidateFullTrip(tripId);
          await invalidateWorkbenchAfterConstraintChange(queryClient, tripId);
        } catch (err) {
          toast.warning(
            err instanceof Error ? err.message : '重新验证失败，请稍后在规划待办手动刷新',
          );
        }
      },
    });
  }, [tripId, queryClient]);

  const source: PlanningConflictsSource | null = useMemo(() => {
    if (!tripId) return null;
    if (bffQuery.data && !useLegacy) return 'bff';
    if (useLegacy && !legacyError) return 'legacy';
    if (useLegacy && legacyError) return null;
    return bffQuery.isLoading || legacyLoading ? null : bffQuery.data ? 'bff' : null;
  }, [tripId, bffQuery.data, bffQuery.isLoading, useLegacy, legacyLoading, legacyError]);

  const bundle = useMemo((): PlanningConflictsResponse | null => {
    const base = bffQuery.data;
    if (!base || useLegacy) return null;
    const rawDecisionChecker =
      deferredStore.decisionChecker ??
      fallbackDecisionChecker ??
      base.decisionChecker ??
      undefined;
    const decisionChecker =
      rawDecisionChecker && tripId
        ? normalizeDecisionCheckerResponse(rawDecisionChecker, tripId)
        : rawDecisionChecker;
    const daySplits =
      decisionChecker?.daySplits ?? base.daySplits;
    return {
      ...base,
      daySplits,
      decisionChecker,
      decisionCheckerDeferred:
        decisionChecker && base.decisionCheckerDeferred
          ? { ...base.decisionCheckerDeferred, status: 'ready' as const }
          : base.decisionCheckerDeferred,
    };
  }, [bffQuery.data, deferredStore.decisionChecker, fallbackDecisionChecker, useLegacy, tripId]);

  const bffItems = bundle ? enrichPlanningConflictItems(bundle.conflicts) : [];
  const items = source === 'bff' ? bffItems : legacyItems;
  const summary =
    source === 'bff' && bundle
      ? {
          total: bundle.summary.total,
          mustHandle: bundle.summary.mustHandle,
          suggestAdjust: bundle.summary.suggestAdjust,
          pendingConfirm: bundle.summary.pendingConfirm,
          byCategory: bundle.summary.byCategory,
        }
      : legacySummary;
  const gateExecute =
    source === 'bff' && bundle?.gateExecute ? bundle.gateExecute : legacyGate;
  const isStale = source === 'bff' ? Boolean(bundle?.isStale) : legacyStale;
  const verdictHeadline =
    source === 'bff'
      ? bundle?.verdict?.headline ?? bundle?.verdict?.status
      : legacyVerdict;

  const inbox = useMemo(() => computePlanningConflictsInboxMetrics(items), [items]);
  const constraintsSummary = bundle?.constraintsSummary ?? null;

  const loading = Boolean(tripId) && (useLegacy ? legacyLoading : bffQuery.isLoading);

  const resolvedDecisionChecker =
    deferredStore.decisionChecker ??
    fallbackDecisionChecker ??
    bundle?.decisionChecker ??
    null;

  const resolvedDecisionCheckerLoading =
    !resolvedDecisionChecker &&
    (useLegacy
      ? fallbackDecisionCheckerLoading
      : deferredStore.loading || fallbackDecisionCheckerLoading);

  const resolvedDecisionCheckerError = resolvedDecisionChecker
    ? null
    : useLegacy
      ? fallbackDecisionCheckerError
      : fallbackDecisionCheckerError ?? deferredStore.error;

  const error =
    bffQuery.isError && !shouldUsePlanningConflictsLegacyFallback(bffQuery.error)
      ? bffQuery.error instanceof Error
        ? bffQuery.error.message
        : '加载规划冲突失败'
      : legacyError;

  return {
    source,
    bundle,
    items,
    summary,
    gateExecute,
    isStale,
    verdictHeadline,
    loading,
    decisionCheckerLoading: includeDecisionChecker ? resolvedDecisionCheckerLoading : false,
    decisionCheckerError: includeDecisionChecker ? resolvedDecisionCheckerError : null,
    decisionChecker: includeDecisionChecker ? resolvedDecisionChecker : null,
    usingFallback,
    error,
    reload,
    revalidateAndReload,
    inbox,
    constraintsSummary,
  };
}
