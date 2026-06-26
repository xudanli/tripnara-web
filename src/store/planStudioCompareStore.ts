import { create } from 'zustand';
import type { OptionComparison } from '@/api/planning-workbench';

interface PlanStudioCompareState {
  byTripId: Record<string, OptionComparison | undefined>;
  setComparison: (tripId: string, comparison: OptionComparison | null | undefined) => void;
  getComparison: (tripId: string) => OptionComparison | undefined;
  clearTrip: (tripId: string) => void;
}

export const usePlanStudioCompareStore = create<PlanStudioCompareState>((set, get) => ({
  byTripId: {},
  setComparison: (tripId, comparison) =>
    set((s) => ({
      byTripId: {
        ...s.byTripId,
        [tripId]: comparison ?? undefined,
      },
    })),
  getComparison: (tripId) => get().byTripId[tripId],
  clearTrip: (tripId) =>
    set((s) => {
      const next = { ...s.byTripId };
      delete next[tripId];
      return { byTripId: next };
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
