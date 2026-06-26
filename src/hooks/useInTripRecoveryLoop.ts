import { useCallback, useEffect, useState } from 'react';
import { tripLoopsApi, TripLoopsApiError } from '@/api/trip-loops';
import { submitInTripCausalTelemetryForRecoveryLoop } from '@/lib/causal-in-trip-telemetry';
import {
  buildApplyInTripPlans,
  inTripUiCanApply,
  resolveLoopRunId,
  summarizeLoopApplyResult,
} from '@/lib/trip-loop.adapter';
import { isTripLoopInTripEnabled } from '@/lib/trip-loop-feature';
import {
  readLoopRunIdFromSession,
  readRecommendedPlansFromSession,
  writeLoopRunIdToSession,
  writeRecommendedPlansToSession,
} from '@/lib/trip-loop-session';
import type {
  InTripApplyPlan,
  InTripLoopUiView,
  InTripRecommendedPlan,
  InTripRecoveryRunResult,
  LoopRunDetail,
  LoopRunStatus,
} from '@/types/trip-loop';

/** 行中页轮询间隔（秒）— 仅读 latest，不受服务端 cooldown 限制 */
export const IN_TRIP_LOOP_POLL_MS = 60_000;

export interface UseInTripRecoveryLoopOptions {
  enabled?: boolean;
  /** TRAVELING 页背景轮询；面板 awaiting_approval 时不应 poll */
  pollIntervalMs?: number;
  onApplied?: () => void;
}

export function useInTripRecoveryLoop(
  tripId: string | null | undefined,
  options?: UseInTripRecoveryLoopOptions,
) {
  const featureEnabled = isTripLoopInTripEnabled();
  const enabled = (options?.enabled ?? true) && featureEnabled && Boolean(tripId);

  const [runResult, setRunResult] = useState<InTripRecoveryRunResult | null>(null);
  const [loopRunDetail, setLoopRunDetail] = useState<LoopRunDetail | null>(null);
  const [ui, setUi] = useState<InTripLoopUiView | null>(null);
  const [recommendedPlans, setRecommendedPlans] = useState<InTripRecommendedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEnvironmentEventId, setLastEnvironmentEventId] = useState<string | undefined>();

  const loopRunId = resolveLoopRunId({
    runLoopRunId: runResult?.loopRunId,
    detail: loopRunDetail,
    ui,
    sessionLoopRunId: tripId ? readLoopRunIdFromSession(tripId, 'in-trip') : null,
  });

  const status: LoopRunStatus | null = runResult?.status ?? loopRunDetail?.status ?? null;
  const needsAttention = ui != null && ui.phase !== 'monitoring' && ui.phase !== 'resolved';

  const shouldPoll =
    Boolean(options?.pollIntervalMs) &&
    enabled &&
    ui?.phase !== 'awaiting_approval';

  const syncFromRunResult = useCallback(
    (run: InTripRecoveryRunResult) => {
      setRunResult(run);
      setLoopRunDetail(null);
      setUi(run.ui ?? null);
      const plans = run.recommendedPlans ?? [];
      setRecommendedPlans(plans);
      if (tripId) {
        writeLoopRunIdToSession(tripId, 'in-trip', run.loopRunId);
        writeRecommendedPlansToSession(tripId, plans);
      }
    },
    [tripId],
  );

  const syncFromLatest = useCallback(
    (latest: { loopRun: LoopRunDetail | null; ui: InTripLoopUiView | null }) => {
      setRunResult(null);
      setLoopRunDetail(latest.loopRun);
      setUi(latest.ui);
      const cached = tripId ? readRecommendedPlansFromSession(tripId) : [];
      setRecommendedPlans(cached);

      const id = resolveLoopRunId({
        detail: latest.loopRun,
        ui: latest.ui,
        sessionLoopRunId: tripId ? readLoopRunIdFromSession(tripId, 'in-trip') : null,
      });
      if (tripId && id) {
        writeLoopRunIdToSession(tripId, 'in-trip', id);
      }
    },
    [tripId],
  );

  const restore = useCallback(async () => {
    if (!tripId || !enabled) return null;
    try {
      setLoading(true);
      setError(null);
      const latest = await tripLoopsApi.getInTripRecoveryLatest(tripId);
      syncFromLatest(latest);
      return latest;
    } catch (e) {
      console.error('[useInTripRecoveryLoop.restore]', e);
      setError(e instanceof TripLoopsApiError ? e.message : '加载行中变化失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled, syncFromLatest]);

  const run = useCallback(
    async (environmentEventId?: string) => {
      if (!tripId || !enabled) return null;
      try {
        setRunning(true);
        setError(null);
        setLastEnvironmentEventId(environmentEventId);
        const result = await tripLoopsApi.runInTripRecovery(tripId, { environmentEventId });
        syncFromRunResult(result);
        return result;
      } catch (e) {
        console.error('[useInTripRecoveryLoop.run]', e);
        setError(e instanceof TripLoopsApiError ? e.message : '运行行中恢复失败');
        return null;
      } finally {
        setRunning(false);
      }
    },
    [tripId, enabled, syncFromRunResult],
  );

  const apply = useCallback(
    async (plans?: InTripApplyPlan[]) => {
      if (!tripId || !enabled) return null;
      const id = loopRunId;
      if (!id) {
        setError('缺少 loopRunId，无法采纳方案');
        return null;
      }

      const cached = tripId ? readRecommendedPlansFromSession(tripId) : [];
      const resolvedPlans =
        plans ??
        buildApplyInTripPlans({
          recommendedPlans,
          cachedPlans: cached,
          ui,
        });

      if (resolvedPlans.length === 0) {
        setError('没有可采纳的方案，请重新获取行中变化');
        return null;
      }

      try {
        setApplying(true);
        setError(null);
        const res = await tripLoopsApi.applyInTripRecovery(tripId, id, { plans: resolvedPlans });
        if (res.applied) {
          const summary = summarizeLoopApplyResult({
            applied: res.applied,
            after: {
              readinessScore: 0,
              hardBlockers: 0,
              mustHandleCount: 0,
              suggestAdjustCount: 0,
              canStartExecute: false,
              verdictStatus: 'UNKNOWN',
            },
          });
          if (summary.deferred.length > 0) {
            setError(
              summary.deferred.map((d) => d.message).filter(Boolean).join('；') ||
                '部分方案被暂缓',
            );
          }
        }
        writeRecommendedPlansToSession(tripId, null);
        setRecommendedPlans([]);
        const uiSnapshot = ui;
        await restore();
        if (uiSnapshot) {
          void submitInTripCausalTelemetryForRecoveryLoop(
            tripId,
            uiSnapshot,
            lastEnvironmentEventId,
          ).catch((error) => {
            console.warn('[useInTripRecoveryLoop] causal telemetry skipped', error);
          });
        }
        options?.onApplied?.();
        return res;
      } catch (e) {
        console.error('[useInTripRecoveryLoop.apply]', e);
        setError(e instanceof TripLoopsApiError ? e.message : '采纳方案失败');
        return null;
      } finally {
        setApplying(false);
      }
    },
    [tripId, enabled, loopRunId, recommendedPlans, ui, lastEnvironmentEventId, restore, options],
  );

  useEffect(() => {
    if (!enabled) {
      setRunResult(null);
      setLoopRunDetail(null);
      setUi(null);
      setRecommendedPlans([]);
      return;
    }
    void restore();
  }, [enabled, restore]);

  useEffect(() => {
    if (!shouldPoll || !options?.pollIntervalMs) return;
    const id = window.setInterval(() => void restore(), options.pollIntervalMs);
    return () => window.clearInterval(id);
  }, [shouldPoll, options?.pollIntervalMs, restore]);

  const canApply = Boolean(loopRunId) && inTripUiCanApply(ui);

  return {
    featureEnabled,
    runResult,
    loopRunDetail,
    loopRunId,
    ui,
    recommendedPlans,
    status,
    needsAttention,
    loading,
    running,
    applying,
    error,
    canApply,
    restore,
    run,
    apply,
    clearError: () => setError(null),
  };
}
