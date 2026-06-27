import { create } from 'zustand';
import type {
  RouteRunExplainOptimization,
  SegmentEditorMode,
  WorldModelGuards,
} from '@/types/world-model-guards';
import type { DecisionCockpitDto } from '@/types/decision-cockpit';
import type { LegEvidenceCard } from '@/types/leg-evidence';
import type { PoiPitfallCard } from '@/types/poi-pitfall';
import type { CascadeAffectedItem, CascadeUiHint } from '@/types/readiness-cascade';
import type { RobustnessDashboardPayload } from '@/types/robustness-dashboard';
import type { RouteRunConfirmationState } from '@/lib/route-run-confirmation';
import type { RouteRunNegotiationState } from '@/lib/route-run-negotiation';

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
  cascadeUiHints: CascadeUiHint[];
  cascadeAffectedItems: CascadeAffectedItem[];
  legEvidenceCards: LegEvidenceCard[];
  legEvidenceHeadlineZh?: string;
  poiPitfallCards: PoiPitfallCard[];
  poiPitfallHeadlineZh?: string;
  robustnessDashboard: RobustnessDashboardPayload | undefined;
  routeRunConfirmation: RouteRunConfirmationState | null;
  routeRunNegotiation: RouteRunNegotiationState | null;
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
    cascadeUiHints: CascadeUiHint[];
    cascadeAffectedItems: CascadeAffectedItem[];
    legEvidenceCards: LegEvidenceCard[];
    legEvidenceHeadlineZh?: string;
    poiPitfallCards: PoiPitfallCard[];
    poiPitfallHeadlineZh?: string;
    robustnessDashboard: RobustnessDashboardPayload | undefined;
    requestId: string;
  }) => void;
  setRouteRunConfirmation: (confirmation: RouteRunConfirmationState | null) => void;
  setRouteRunNegotiation: (negotiation: RouteRunNegotiationState | null) => void;
  reset: () => void;
}

const initialState: Omit<
  WorldModelGuardsState,
  'setFromRouteRun' | 'setRouteRunConfirmation' | 'setRouteRunNegotiation' | 'reset'
> = {
  worldModelGuards: null,
  segmentEditorMode: 'full',
  isRouteTopologyLocked: false,
  lockedSegmentIds: new Set(),
  itinerary: undefined,
  explainOptimization: undefined,
  optimizationMethod: undefined,
  decisionCockpit: undefined,
  cascadeUiHints: [],
  cascadeAffectedItems: [],
  legEvidenceCards: [],
  legEvidenceHeadlineZh: undefined,
  poiPitfallCards: [],
  poiPitfallHeadlineZh: undefined,
  robustnessDashboard: undefined,
  routeRunConfirmation: null,
  routeRunNegotiation: null,
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
      cascadeUiHints: patch.cascadeUiHints,
      cascadeAffectedItems: patch.cascadeAffectedItems,
      legEvidenceCards: patch.legEvidenceCards,
      legEvidenceHeadlineZh: patch.legEvidenceHeadlineZh,
      poiPitfallCards: patch.poiPitfallCards,
      poiPitfallHeadlineZh: patch.poiPitfallHeadlineZh,
      robustnessDashboard: patch.robustnessDashboard,
      routeRunConfirmation: null,
      routeRunNegotiation: null,
      lastRequestId: patch.requestId,
    }),
  setRouteRunConfirmation: (confirmation) => set({ routeRunConfirmation: confirmation }),
  setRouteRunNegotiation: (negotiation) => set({ routeRunNegotiation: negotiation }),
  reset: () => set({ ...initialState, lockedSegmentIds: new Set() }),
}));
