import { create } from 'zustand';
import type { OptionComparison } from '@/api/planning-workbench';
import type { RelaxationSuggestionsBundle } from '@/types/relaxation-suggestions';

interface PlanStudioCompareState {
  byTripId: Record<string, OptionComparison | undefined>;
  selectedOptionByTripId: Record<string, string | undefined>;
  relaxationBundleByTripId: Record<string, RelaxationSuggestionsBundle | undefined>;
  setComparison: (tripId: string, comparison: OptionComparison | null | undefined) => void;
  setSelectedOption: (tripId: string, optionId: string | null | undefined) => void;
  setRelaxationBundle: (tripId: string, bundle: RelaxationSuggestionsBundle | null | undefined) => void;
  getComparison: (tripId: string) => OptionComparison | undefined;
  getSelectedOption: (tripId: string) => string | undefined;
  getRelaxationBundle: (tripId: string) => RelaxationSuggestionsBundle | undefined;
  clearTrip: (tripId: string) => void;
}

export const usePlanStudioCompareStore = create<PlanStudioCompareState>((set, get) => ({
  byTripId: {},
  selectedOptionByTripId: {},
  relaxationBundleByTripId: {},
  setComparison: (tripId, comparison) =>
    set((s) => ({
      byTripId: {
        ...s.byTripId,
        [tripId]: comparison ?? undefined,
      },
    })),
  setSelectedOption: (tripId, optionId) =>
    set((s) => ({
      selectedOptionByTripId: {
        ...s.selectedOptionByTripId,
        [tripId]: optionId ?? undefined,
      },
    })),
  setRelaxationBundle: (tripId, bundle) =>
    set((s) => ({
      relaxationBundleByTripId: {
        ...s.relaxationBundleByTripId,
        [tripId]: bundle ?? undefined,
      },
    })),
  getComparison: (tripId) => get().byTripId[tripId],
  getSelectedOption: (tripId) => get().selectedOptionByTripId[tripId],
  getRelaxationBundle: (tripId) => get().relaxationBundleByTripId[tripId],
  clearTrip: (tripId) =>
    set((s) => {
      const next = { ...s.byTripId };
      const nextSelected = { ...s.selectedOptionByTripId };
      const nextRelax = { ...s.relaxationBundleByTripId };
      delete next[tripId];
      delete nextSelected[tripId];
      delete nextRelax[tripId];
      return {
        byTripId: next,
        selectedOptionByTripId: nextSelected,
        relaxationBundleByTripId: nextRelax,
      };
    }),
}));

/** 发布 compare 读模型并通知 Decision Strip 刷新 */
export function publishPlanStudioComparison(
  tripId: string,
  comparison: OptionComparison | null | undefined,
): void {
  usePlanStudioCompareStore.getState().setComparison(tripId, comparison);
  window.dispatchEvent(
    new CustomEvent('plan-studio:comparison-updated', {
      detail: { tripId },
    }),
  );
}

export function publishRelaxationSuggestionsBundle(
  tripId: string,
  bundle: RelaxationSuggestionsBundle | null | undefined,
): void {
  usePlanStudioCompareStore.getState().setRelaxationBundle(tripId, bundle);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('plan-studio:relaxation-updated', {
      detail: { tripId },
    }),
  );
}
