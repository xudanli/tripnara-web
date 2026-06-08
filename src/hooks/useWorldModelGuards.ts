import {
  canEditSegmentStructure,
  canEditSlotTiming,
  canRunRouteRecalculation,
  getSegmentEditorDegradation,
} from '@/lib/world-model-guards';
import { useWorldModelGuardsStore } from '@/store/worldModelGuardsStore';

/** 订阅 route_and_run 下发的 `explain.world_model_guards` 与派生编辑能力 */
export function useWorldModelGuards() {
  const worldModelGuards = useWorldModelGuardsStore((s) => s.worldModelGuards);
  const segmentEditorMode = useWorldModelGuardsStore((s) => s.segmentEditorMode);
  const isRouteTopologyLocked = useWorldModelGuardsStore((s) => s.isRouteTopologyLocked);
  const lockedSegmentIds = useWorldModelGuardsStore((s) => s.lockedSegmentIds);
  const explainOptimization = useWorldModelGuardsStore((s) => s.explainOptimization);
  const optimizationMethod = useWorldModelGuardsStore((s) => s.optimizationMethod);
  const degradation = getSegmentEditorDegradation(worldModelGuards);

  return {
    worldModelGuards,
    segmentEditorMode,
    isRouteTopologyLocked,
    lockedSegmentIds,
    explainOptimization,
    optimizationMethod,
    degradation,
    canEditStructure: canEditSegmentStructure(worldModelGuards),
    canEditTiming: canEditSlotTiming(worldModelGuards),
    canRecalculateRoute: canRunRouteRecalculation(worldModelGuards),
  };
}
