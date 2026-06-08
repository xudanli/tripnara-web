import { create } from 'zustand';
import type {
  RouteRunExplainOptimization,
  SegmentEditorMode,
  WorldModelGuards,
} from '@/types/world-model-guards';
import type { DecisionCockpitDto } from '@/types/decision-cockpit';

export interface WorldModelGuardsState {
  worldModelGuards: WorldModelGuards | null;
  /** 经 `isRouteTopologyLocked` 降级后的有效模式 */
  segmentEditorMode: SegmentEditorMode;
  isRouteTopologyLocked: boolean;
  lockedSegmentIds: Set<string>;
  itinerary: unknown;
  explainOptimization: RouteRunExplainOptimization | undefined;
  optimizationMethod: string | undefined;
  decisionCockpit: DecisionCockpitDto | undefined;
  lastRequestId: string | undefined;
  setFromRouteRun: (patch: {
    worldModelGuards: WorldModelGuards | null;
    segmentEditorMode: SegmentEditorMode;
    isRouteTopologyLocked: boolean;
    lockedSegmentIds: Set<string>;
    itinerary: unknown;
    explainOptimization: RouteRunExplainOptimization | undefined;
    optimizationMethod: string | undefined;
    decisionCockpit: DecisionCockpitDto | undefined;
    requestId: string;
  }) => void;
  reset: () => void;
}

const initialState: Omit<WorldModelGuardsState, 'setFromRouteRun' | 'reset'> = {
  worldModelGuards: null,
  segmentEditorMode: 'full',
  isRouteTopologyLocked: false,
  lockedSegmentIds: new Set(),
  itinerary: undefined,
  explainOptimization: undefined,
  optimizationMethod: undefined,
  decisionCockpit: undefined,
  lastRequestId: undefined,
};

export const useWorldModelGuardsStore = create<WorldModelGuardsState>((set) => ({
  ...initialState,
  setFromRouteRun: (patch) =>
    set({
      worldModelGuards: patch.worldModelGuards,
      segmentEditorMode: patch.segmentEditorMode,
      isRouteTopologyLocked: patch.isRouteTopologyLocked,
      lockedSegmentIds: patch.lockedSegmentIds,
      itinerary: patch.itinerary,
      explainOptimization: patch.explainOptimization,
      optimizationMethod: patch.optimizationMethod,
      decisionCockpit: patch.decisionCockpit,
      lastRequestId: patch.requestId,
    }),
  reset: () => set({ ...initialState, lockedSegmentIds: new Set() }),
}));
