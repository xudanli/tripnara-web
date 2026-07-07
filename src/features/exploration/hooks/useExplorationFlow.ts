import { useCallback, useMemo, useState } from 'react';
import {
  persistFlowState,
  readFlowState,
  readFlowStateForScenario,
  type ExploreFlowState,
} from '../flow-state';

export function useExplorationFlow(scenarioId?: string) {
  const [flow, setFlow] = useState<Partial<ExploreFlowState>>(() => readFlowState());

  const scopedFlow = useMemo(() => {
    if (!scenarioId) return flow;
    return readFlowStateForScenario(scenarioId) ?? flow;
  }, [scenarioId, flow]);

  const update = useCallback((patch: Partial<ExploreFlowState>) => {
    const next = persistFlowState(patch);
    setFlow(next);
    return next;
  }, []);

  return {
    flow: scopedFlow,
    update,
    scenarioId: scopedFlow.scenarioId,
    sessionId: scopedFlow.sessionId,
    tripId: scopedFlow.tripId,
    assignedVariant: scopedFlow.assignedVariant,
    selectedRouteId: scopedFlow.selectedRouteId,
  };
}
