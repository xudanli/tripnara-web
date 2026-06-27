import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { tripBudgetApi } from '@/api/trip-budget';
import { itineraryItemsApi, tripsApi } from '@/api/trips';
import {
  buildPlanningConstraintsSummary,
  constraintsMetadataForConfirm,
  enrichConstraintsSummaryFromLocal,
  mapConstraintsSummaryFromBff,
  mergeConstraintsMetadataPatch,
} from '@/lib/planning-constraints.util';
import {
  dispatchPlanStudioConstraintsChanged,
  PLAN_STUDIO_CONSTRAINTS_CHANGED,
} from '@/lib/plan-studio-constraints-events';
import type {
  ConstraintsSummaryResponse,
  PlanStudioConstraintsChangeSource,
  PlanningConstraintsSummary,
} from '@/types/planning-constraints';
import type { IntentTravelMode, TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';

export type ConstraintsSummarySource = 'bff' | 'embedded' | 'm1';

function isBffUnavailable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

async function loadM1Inputs(
  tripId: string,
  trip: TripDetail,
): Promise<{
  budgetProfile: TripBudgetProfile | null;
  collaboratorCount: number;
  intentTravelMode: IntentTravelMode | null;
  sampleSegmentTravelMode: string | null;
}> {
  const firstDay = trip.TripDay?.[0];
  const sampleModePromise =
    firstDay?.id != null
      ? itineraryItemsApi
          .getDayTravelInfo(tripId, firstDay.id)
          .then((info) => {
            const segment = info.segments?.find((s) => s.duration != null && s.duration > 0);
            return segment?.travelMode ?? info.segments?.[0]?.travelMode ?? null;
          })
          .catch(() => null)
      : Promise.resolve(null);

  const [profile, collaborators, intent, sampleSegmentTravelMode] = await Promise.all([
    tripBudgetApi.getProfile(tripId).catch(() => null),
    tripsApi.getCollaborators(tripId).catch(() => []),
    tripsApi.getIntent(tripId).catch(() => null),
    sampleModePromise,
  ]);

  return {
    budgetProfile: profile,
    collaboratorCount: Array.isArray(collaborators) ? collaborators.length : 0,
    intentTravelMode: intent?.pacingConfig?.travelMode ?? trip.pacingConfig?.travelMode ?? null,
    sampleSegmentTravelMode,
  };
}

export interface UseConstraintsSummaryOptions {
  /** P2：`planning-conflicts?includeConstraintsSummary=1` 嵌入摘要 */
  embeddedSummary?: ConstraintsSummaryResponse | null;
}

export interface UseConstraintsSummaryResult {
  summary: PlanningConstraintsSummary | null;
  source: ConstraintsSummarySource | null;
  loading: boolean;
  /** 至少完成过一次 load 尝试（避免首屏误报失败） */
  loadSettled: boolean;
  error: string | null;
  reload: () => Promise<void>;
  confirmConstraints: (userId: string) => Promise<void>;
  confirming: boolean;
}

export function useConstraintsSummary(
  tripId: string | null | undefined,
  trip: TripDetail | null | undefined,
  options?: UseConstraintsSummaryOptions,
): UseConstraintsSummaryResult {
  const [summary, setSummary] = useState<PlanningConstraintsSummary | null>(null);
  const [source, setSource] = useState<ConstraintsSummarySource | null>(null);
  const [loading, setLoading] = useState(() => Boolean(tripId && trip));
  const [error, setError] = useState<string | null>(null);
  const [loadSettled, setLoadSettled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const wasUserConfirmedRef = useRef<boolean | null>(null);
  const embeddedRef = useRef(options?.embeddedSummary);
  embeddedRef.current = options?.embeddedSummary;

  const reload = useCallback(async () => {
    if (!tripId) {
      setSummary(null);
      setSource(null);
      setLoading(false);
      setLoadSettled(true);
      return;
    }
    if (!trip) {
      setLoading(true);
      setLoadSettled(false);
      return;
    }

    setLoading(true);
    setError(null);
    setLoadSettled(false);

    let localSummary: PlanningConstraintsSummary | null = null;
    try {
      const m1 = await loadM1Inputs(tripId, trip);
      localSummary = buildPlanningConstraintsSummary({
        trip,
        ...m1,
      });

      try {
        const bff = await tripsApi.getConstraintsSummary(tripId);
        setSummary(
          enrichConstraintsSummaryFromLocal(mapConstraintsSummaryFromBff(bff), localSummary),
        );
        setSource('bff');
        return;
      } catch (bffError) {
        if (!isBffUnavailable(bffError)) {
          console.warn('[useConstraintsSummary] BFF failed, falling back to local', bffError);
        }
      }

      const embedded = embeddedRef.current;
      if (embedded) {
        try {
          setSummary(
            enrichConstraintsSummaryFromLocal(
              mapConstraintsSummaryFromBff(embedded),
              localSummary,
            ),
          );
          setSource('embedded');
          return;
        } catch (embeddedError) {
          console.warn(
            '[useConstraintsSummary] embedded summary invalid, falling back to M1',
            embeddedError,
          );
        }
      }

      setSummary(localSummary);
      setSource('m1');
    } catch (err) {
      console.warn('[useConstraintsSummary] summary load failed', err);
      if (localSummary) {
        setSummary(localSummary);
        setSource('m1');
        setError(err instanceof Error ? err.message : '约束摘要同步失败，已显示本地数据');
      } else {
        setError(err instanceof Error ? err.message : '加载约束摘要失败');
        setSummary(null);
        setSource(null);
      }
    } finally {
      setLoading(false);
      setLoadSettled(true);
    }
  }, [tripId, trip]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // planning-conflicts 嵌入摘要晚于首屏时补拉
  useEffect(() => {
    if (!tripId || !trip || !embeddedRef.current || summary || loading) return;
    void reload();
  }, [options?.embeddedSummary, tripId, trip, summary, loading, reload]);

  useEffect(() => {
    if (!summary) return;
    if (wasUserConfirmedRef.current === true && summary.needsReconfirm) {
      toast.info('约束已变更，请重新确认后再继续规划');
    }
    wasUserConfirmedRef.current = summary.isUserConfirmed;
  }, [summary]);

  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener('plan-studio:schedule-refresh', refresh);
    window.addEventListener(PLAN_STUDIO_CONSTRAINTS_CHANGED, refresh);
    return () => {
      window.removeEventListener('plan-studio:schedule-refresh', refresh);
      window.removeEventListener(PLAN_STUDIO_CONSTRAINTS_CHANGED, refresh);
    };
  }, [reload]);

  const confirmConstraints = useCallback(
    async (userId: string) => {
      if (!tripId || !trip || !summary?.allReady) return;
      try {
        setConfirming(true);
        try {
          await tripsApi.confirmConstraints(tripId, {
            constraintsVersion: summary.constraintsVersion,
          });
          toast.success('已确认行程约束');
          window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
          dispatchPlanStudioConstraintsChanged(tripId, 'intent');
          return;
        } catch (patchError) {
          if (!isBffUnavailable(patchError)) throw patchError;
        }

        const patch = constraintsMetadataForConfirm(trip, userId);
        await tripsApi.update(tripId, {
          metadata: mergeConstraintsMetadataPatch(trip, {
            ...patch,
            constraintsConfirmedVersion: patch.constraintsVersion,
          }),
        });
        toast.success('已确认行程约束');
        window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
        dispatchPlanStudioConstraintsChanged(tripId, 'intent');
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === 'CONSTRAINTS_NOT_READY') {
          toast.error('仍有约束项未就绪，请先处理待办项');
        } else if (code === 'CONSTRAINTS_STALE') {
          toast.error('约束已更新，请刷新后重新确认');
          void reload();
        } else {
          toast.error(err instanceof Error ? err.message : '确认约束失败');
        }
        throw err;
      } finally {
        setConfirming(false);
      }
    },
    [tripId, trip, summary?.allReady, summary?.constraintsVersion, reload],
  );

  return {
    summary,
    source,
    loading,
    loadSettled,
    error,
    reload,
    confirmConstraints,
    confirming,
  };
}

/** 约束写操作成功：服务端已 bump version 时仅广播（P1-C） */
export function notifyPlanStudioConstraintsChanged(
  tripId: string,
  source: PlanStudioConstraintsChangeSource,
): void {
  dispatchPlanStudioConstraintsChanged(tripId, source);
}

/** @deprecated 服务端已递增 version；保留别名避免遗漏调用点 */
export const persistConstraintsChangedMetadata = notifyPlanStudioConstraintsChanged;
