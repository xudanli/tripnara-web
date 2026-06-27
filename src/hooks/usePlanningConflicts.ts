import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { tripConstraintSolverApi } from '@/api/trip-constraint-solver';
import { tripsApi } from '@/api/trips';
import { computeGateExecuteStatus } from '@/lib/gate-execute';
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
  error: string | null;
  reload: () => Promise<void>;
  revalidateAndReload: (options?: FeasibilityReportValidateOptions) => Promise<void>;
  inbox: PlanningConflictsInboxMetrics;
  /** P2：BFF 嵌入的约束摘要（raw DTO） */
  constraintsSummary: ConstraintsSummaryResponse | null;
}

function isBffUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const axiosStatus = (error as { response?: { status?: number } }).response?.status;
  return axiosStatus === 404 || axiosStatus === 501;
}

function emptyGate(): GateExecuteStatus {
  return { blocked: false, reasons: [] };
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

export function usePlanningConflicts(tripId: string | null | undefined): UsePlanningConflictsResult {
  const [source, setSource] = useState<PlanningConflictsSource | null>(null);
  const [bundle, setBundle] = useState<PlanningConflictsResponse | null>(null);
  const [legacyItems, setLegacyItems] = useState<PlanningConflictItem[]>([]);
  const [legacySummary, setLegacySummary] = useState<PlanningConflictSummary>({
    total: 0,
    mustHandle: 0,
    suggestAdjust: 0,
    pendingConfirm: 0,
    byCategory: {},
  });
  const [legacyGate, setLegacyGate] = useState<GateExecuteStatus>(emptyGate());
  const [legacyStale, setLegacyStale] = useState(false);
  const [legacyVerdict, setLegacyVerdict] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tripId) {
      setBundle(null);
      setLegacyItems([]);
      setSource(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await tripsApi.getPlanningConflicts(tripId, {
        includeConstraintsSummary: true,
      });
      setBundle(res);
      setSource('bff');
      setLegacyItems([]);
    } catch (bffError) {
      if (!isBffUnavailableError(bffError)) {
        setBundle(null);
        setSource(null);
        setError(bffError instanceof Error ? bffError.message : '加载规划冲突失败');
        setLoading(false);
        return;
      }
      console.warn('[usePlanningConflicts] BFF unavailable, falling back to legacy merge', bffError);
      try {
        const legacy = await loadLegacyMerged(tripId);
        setBundle(null);
        setSource('legacy');
        setLegacyItems(legacy.items);
        setLegacySummary(legacy.summary);
        setLegacyGate(legacy.gateExecute);
        setLegacyStale(legacy.isStale);
        setLegacyVerdict(legacy.verdictHeadline);
      } catch (legacyError) {
        setBundle(null);
        setSource(null);
        setLegacyItems([]);
        setError(
          legacyError instanceof Error ? legacyError.message : '加载规划冲突失败',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const revalidateAndReload = useCallback(
    async (options?: FeasibilityReportValidateOptions) => {
      if (!tripId) return;
      await tripConstraintSolverApi.revalidateFullTrip(tripId, options);
      await reload();
    },
    [tripId, reload],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onRefresh = () => {
      void reload();
    };
    window.addEventListener('plan-studio:schedule-refresh', onRefresh);
    window.addEventListener('plan-studio:loop-readiness-changed', onRefresh);
    return () => {
      window.removeEventListener('plan-studio:schedule-refresh', onRefresh);
      window.removeEventListener('plan-studio:loop-readiness-changed', onRefresh);
    };
  }, [reload]);

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
          await reload();
        } catch (err) {
          toast.warning(
            err instanceof Error ? err.message : '重新验证失败，请稍后在规划待办手动刷新',
          );
        }
      },
    });
  }, [tripId, reload]);

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

  return {
    source,
    bundle,
    items,
    summary,
    gateExecute,
    isStale,
    verdictHeadline,
    loading,
    error,
    reload,
    revalidateAndReload,
    inbox,
    constraintsSummary,
  };
}
