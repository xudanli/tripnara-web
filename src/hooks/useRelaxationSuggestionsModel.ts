import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RouteAndRunResponse } from '@/api/agent';
import { parseRelaxationSuggestionsBundle } from '@/lib/relaxation-suggestions-parse.util';
import { publishRelaxationSuggestionsBundle, usePlanStudioCompareStore } from '@/store/planStudioCompareStore';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
import type { RelaxationSuggestionsBundle } from '@/types/relaxation-suggestions';

export interface UseRelaxationSuggestionsModelResult {
  bundle: RelaxationSuggestionsBundle | null;
  visible: boolean;
  selectedActionIds: string[];
  toggleAction: (actionId: string) => void;
  selectSingle: (actionId: string) => void;
  clearSelection: () => void;
}

function ingestResponse(tripId: string, response: RouteAndRunResponse | null | undefined) {
  const bundle = parseRelaxationSuggestionsBundle(response);
  publishRelaxationSuggestionsBundle(tripId, bundle);
  return bundle;
}

export function useRelaxationSuggestionsModel(
  tripId: string | null | undefined,
): UseRelaxationSuggestionsModelResult {
  const taskResult = usePlanningTaskStore((s) => s.resultData);
  const cachedBundle = usePlanStudioCompareStore((s) =>
    tripId ? s.relaxationBundleByTripId[tripId] : undefined,
  );

  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);

  const bundle = useMemo(() => {
    if (taskResult) {
      const parsed = parseRelaxationSuggestionsBundle(taskResult);
      if (parsed) return parsed;
    }
    return cachedBundle ?? null;
  }, [taskResult, cachedBundle]);

  useEffect(() => {
    if (!tripId || !taskResult) return;
    ingestResponse(tripId, taskResult);
  }, [tripId, taskResult]);

  useEffect(() => {
    if (!tripId) return;
    const onRelaxationUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ tripId?: string }>).detail;
      if (detail?.tripId && detail.tripId !== tripId) return;
      setSelectedActionIds([]);
    };
    window.addEventListener('plan-studio:relaxation-updated', onRelaxationUpdated);
    return () => window.removeEventListener('plan-studio:relaxation-updated', onRelaxationUpdated);
  }, [tripId]);

  useEffect(() => {
    if (!bundle) {
      setSelectedActionIds([]);
      return;
    }
    const recommended = bundle.suggestions.find((s) => s.recommended);
    if (bundle.context.selectionMode === 'single' && recommended) {
      setSelectedActionIds([recommended.actionId]);
    } else {
      setSelectedActionIds([]);
    }
  }, [bundle]);

  const toggleAction = useCallback(
    (actionId: string) => {
      if (!bundle) return;
      if (bundle.context.selectionMode === 'single') {
        setSelectedActionIds([actionId]);
        return;
      }
      setSelectedActionIds((prev) =>
        prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId],
      );
    },
    [bundle],
  );

  const selectSingle = useCallback((actionId: string) => {
    setSelectedActionIds([actionId]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedActionIds([]);
  }, []);

  return {
    bundle,
    visible: Boolean(bundle?.suggestions.length && bundle.context.questionId),
    selectedActionIds,
    toggleAction,
    selectSingle,
    clearSelection,
  };
}
