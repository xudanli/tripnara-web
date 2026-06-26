import { useCallback, useEffect, useState } from 'react';
import { tripLoopsApi, TripLoopsApiError } from '@/api/trip-loops';
import {
  buildApplyPatches,
  readinessUiCanApply,
  resolveLoopRunId,
  summarizeLoopApplyResult,
} from '@/lib/trip-loop.adapter';
import { isTripLoopReadinessEnabled } from '@/lib/trip-loop-feature';
import {
  readLoopRunIdFromSession,
  readRecommendedPatchesFromSession,
  writeLoopRunIdToSession,
  writeRecommendedPatchesToSession,
} from '@/lib/trip-loop-session';
import type {
  LoopApplyPatch,
  LoopRecommendedPatch,
  LoopRunDetail,
  LoopRunStatus,
  ReadinessRepairRunRequest,
  ReadinessRepairRunResult,
  TripLoopUiView,
} from '@/types/trip-loop';

export interface UseReadinessRepairLoopOptions {
  /** 功能开关 + tripId；勿与 Sheet 开合绑定 */
  enabled?: boolean;
  /** 为 true 时拉取 GET latest（Sheet 传 open，全页默认 true） */
  autoRestore?: boolean;
  onApplied?: () => void;
}

export function useReadinessRepairLoop(
  tripId: string | null | undefined,
  options?: UseReadinessRepairLoopOptions,
) {
  const featureEnabled = isTripLoopReadinessEnabled();
  const enabled = (options?.enabled ?? true) && featureEnabled && Boolean(tripId);

  const [runResult, setRunResult] = useState<ReadinessRepairRunResult | null>(null);
  const [loopRunDetail, setLoopRunDetail] = useState<LoopRunDetail | null>(null);
  const [ui, setUi] = useState<TripLoopUiView | null>(null);
  const [recommendedPatches, setRecommendedPatches] = useState<LoopRecommendedPatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loopRunId = resolveLoopRunId({
    runLoopRunId: runResult?.loopRunId,
    detail: loopRunDetail,
    ui,
    sessionLoopRunId: tripId ? readLoopRunIdFromSession(tripId, 'readiness') : null,
  });

  const status: LoopRunStatus | null = runResult?.status ?? loopRunDetail?.status ?? null;

  const syncFromRunResult = useCallback(
    (run: ReadinessRepairRunResult) => {
      setRunResult(run);
      setLoopRunDetail(null);
      setUi(run.ui ?? null);
      const patches = run.recommendedPatches ?? [];
      setRecommendedPatches(patches);
      if (tripId) {
        writeLoopRunIdToSession(tripId, 'readiness', run.loopRunId);
        writeRecommendedPatchesToSession(tripId, patches);
      }
    },
    [tripId],
  );

  const syncFromLatest = useCallback(
    (latest: { loopRun: LoopRunDetail | null; ui: TripLoopUiView | null }) => {
      setRunResult(null);
      setLoopRunDetail(latest.loopRun);
      setUi(latest.ui);
      const cached = tripId ? readRecommendedPatchesFromSession(tripId) : [];
      setRecommendedPatches(cached);

      const id = resolveLoopRunId({
        detail: latest.loopRun,
        ui: latest.ui,
        sessionLoopRunId: tripId ? readLoopRunIdFromSession(tripId, 'readiness') : null,
      });
      if (tripId && id) {
        writeLoopRunIdToSession(tripId, 'readiness', id);
      }
    },
    [tripId],
  );

  const restore = useCallback(async () => {
    if (!tripId || !enabled) return null;
    try {
      setLoading(true);
      setError(null);
      const latest = await tripLoopsApi.getReadinessRepairLatest(tripId);
      syncFromLatest(latest);
      return latest;
    } catch (e) {
      console.error('[useReadinessRepairLoop.restore]', e);
      setError(e instanceof TripLoopsApiError ? e.message : '恢复验证闭环失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, enabled, syncFromLatest]);

  const run = useCallback(
    async (body: ReadinessRepairRunRequest = { forceRefreshEvidence: true, runMonteCarlo: true }) => {
      if (!tripId || !enabled) return null;
      try {
        setRunning(true);
        setError(null);
        const result = await tripLoopsApi.runReadinessRepair(tripId, body);
        syncFromRunResult(result);
        return result;
      } catch (e) {
        console.error('[useReadinessRepairLoop.run]', e);
        setError(e instanceof TripLoopsApiError ? e.message : '运行验证闭环失败');
        return null;
      } finally {
        setRunning(false);
      }
    },
    [tripId, enabled, syncFromRunResult],
  );

  const apply = useCallback(
    async (patches?: LoopApplyPatch[]) => {
      if (!tripId || !enabled) return null;
      const id = loopRunId;
      if (!id) {
        setError('缺少 loopRunId，无法应用调整');
        return null;
      }

      const cached = tripId ? readRecommendedPatchesFromSession(tripId) : [];
      const resolvedPatches =
        patches ??
        buildApplyPatches({
          recommendedPatches,
          cachedPatches: cached,
          ui,
        });

      if (resolvedPatches.length === 0) {
        setError('没有可应用的修复项，请重新运行验证或检查推荐方案');
        return null;
      }

      try {
        setApplying(true);
        setError(null);
        const res = await tripLoopsApi.applyReadinessRepair(tripId, id, {
          patches: resolvedPatches,
        });
        const summary = summarizeLoopApplyResult(res);
        if (summary.deferred.length > 0) {
          const msg = summary.deferred.map((d) => d.message).filter(Boolean).join('；');
          setError(msg || '部分调整被暂缓，需先确认协商点');
        }
        writeRecommendedPatchesToSession(tripId, null);
        setRecommendedPatches([]);
        await restore();
        if (summary.allApplied) {
          options?.onApplied?.();
        }
        return res;
      } catch (e) {
        console.error('[useReadinessRepairLoop.apply]', e);
        setError(e instanceof TripLoopsApiError ? e.message : '应用调整失败');
        return null;
      } finally {
        setApplying(false);
      }
    },
    [tripId, enabled, loopRunId, recommendedPatches, ui, restore, options],
  );

  useEffect(() => {
    if (!enabled) {
      setRunResult(null);
      setLoopRunDetail(null);
      setUi(null);
      setRecommendedPatches([]);
      setLoading(false);
      setRunning(false);
      setApplying(false);
      setError(null);
      return;
    }
    if (options?.autoRestore === false) return;
    void restore();
  }, [enabled, options?.autoRestore, restore]);

  const canApply = Boolean(loopRunId) && readinessUiCanApply(ui);

  return {
    featureEnabled,
    runResult,
    loopRunDetail,
    loopRunId,
    ui,
    recommendedPatches,
    status,
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
