import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OptionComparison } from '@/api/planning-workbench';
import { subscribePlanStudioConstraintsChanged } from '@/lib/plan-studio-constraints-events';
import {
  mergeSolutionComparisonReadModel,
  parseExplainAlternativesFromRecord,
} from '@/lib/solution-comparison-parse.util';
import {
  buildSolutionMatrixModel,
  pickDefaultSelectedOptionId,
  type SolutionMatrixModel,
} from '@/lib/solution-matrix-model';
import {
  isLightConstraintChange,
  SOLUTION_MATRIX_FAST_REFRESH_MS,
} from '@/lib/solution-matrix-refresh.util';
import { usePlanStudioCompareStore } from '@/store/planStudioCompareStore';
import { usePlanningTaskStore } from '@/store/planningTaskStore';

export interface UseSolutionMatrixModelResult {
  model: SolutionMatrixModel;
  comparison: OptionComparison | undefined;
  selectedOptionId: string | null;
  setSelectedOptionId: (optionId: string) => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  /** 约束轻量变更后的快路径 refreshing */
  refreshing: boolean;
}

function asRouteRunRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function useSolutionMatrixModel(tripId: string | null | undefined): UseSolutionMatrixModelResult {
  const taskResult = usePlanningTaskStore((s) => s.resultData);
  const cachedComparison = usePlanStudioCompareStore((s) =>
    tripId ? s.byTripId[tripId] : undefined,
  );
  const cachedSelected = usePlanStudioCompareStore((s) =>
    tripId ? s.selectedOptionByTripId[tripId] : undefined,
  );

  const [remoteComparison, setRemoteComparison] = useState<OptionComparison | undefined>();
  const [expanded, setExpanded] = useState(false);
  const [selectedOptionId, setSelectedOptionIdState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const stopRefreshing = useCallback(() => {
    clearRefreshTimer();
    setRefreshing(false);
  }, [clearRefreshTimer]);

  const startFastRefresh = useCallback(() => {
    clearRefreshTimer();
    setRefreshing(true);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      setRefreshing(false);
    }, SOLUTION_MATRIX_FAST_REFRESH_MS);
  }, [clearRefreshTimer]);

  const reload = useCallback(() => {
    if (!tripId) return;
    const store = usePlanStudioCompareStore.getState();
    setRemoteComparison(store.getComparison(tripId));
    const selected = store.getSelectedOption(tripId);
    if (selected) setSelectedOptionIdState(selected);
  }, [tripId]);

  useEffect(() => {
    reload();
  }, [reload, cachedComparison, cachedSelected]);

  useEffect(() => {
    if (!tripId) return;
    const onComparisonUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string }>).detail;
      if (detail?.tripId && detail.tripId !== tripId) return;
      stopRefreshing();
      reload();
    };
    window.addEventListener('plan-studio:comparison-updated', onComparisonUpdated);
    return () => window.removeEventListener('plan-studio:comparison-updated', onComparisonUpdated);
  }, [tripId, reload, stopRefreshing]);

  useEffect(() => {
    if (!tripId) return;
    return subscribePlanStudioConstraintsChanged((detail) => {
      if (detail.tripId !== tripId) return;
      if (isLightConstraintChange(detail.source)) {
        startFastRefresh();
      }
    });
  }, [tripId, startFastRefresh]);

  useEffect(() => {
    if (!tripId || !taskResult) return;
    const record = asRouteRunRecord(taskResult);
    if (!record) return;

    const explainAlternatives = parseExplainAlternativesFromRecord(record);
    if (explainAlternatives.length >= 2) {
      const merged = mergeSolutionComparisonReadModel(cachedComparison ?? remoteComparison, {
        alternatives: explainAlternatives,
        source: cachedComparison ? 'merged' : 'explain_alternatives',
      });
      if (merged?.recommendation) {
        usePlanStudioCompareStore.getState().setComparison(tripId, merged);
        setRemoteComparison(merged);
      }
    }
  }, [tripId, taskResult, cachedComparison, remoteComparison]);

  useEffect(() => () => clearRefreshTimer(), [clearRefreshTimer]);

  const comparison = remoteComparison ?? cachedComparison;

  const model = useMemo(() => buildSolutionMatrixModel(comparison), [comparison]);

  useEffect(() => {
    if (!tripId) return;
    if (!model.visible) {
      setExpanded(false);
      setSelectedOptionIdState(null);
      usePlanStudioCompareStore.getState().setSelectedOption(tripId, undefined);
      return;
    }
    setSelectedOptionIdState((prev) => {
      const fromStore = usePlanStudioCompareStore.getState().getSelectedOption(tripId);
      const candidate = fromStore ?? prev;
      if (candidate && model.columns.some((c) => c.optionId === candidate)) return candidate;
      return pickDefaultSelectedOptionId(model);
    });
  }, [model, tripId]);

  const setSelectedOptionId = useCallback(
    (optionId: string) => {
      setSelectedOptionIdState(optionId);
      if (tripId) {
        usePlanStudioCompareStore.getState().setSelectedOption(tripId, optionId);
      }
    },
    [tripId],
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  return {
    model,
    comparison,
    selectedOptionId,
    setSelectedOptionId,
    expanded,
    setExpanded,
    toggleExpanded,
    refreshing,
  };
}
