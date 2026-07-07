import { useMemo } from 'react';
import { useTripTravelContext } from '../context/TripTravelContext';
import {
  buildAssistantTravelContextGrounding,
  type AssistantTravelContextGrounding,
} from '../lib/assistant-context-grounding.util';

const EMPTY_GROUNDING: AssistantTravelContextGrounding = {
  contextId: '',
  revision: 0,
  openDecisionCount: 0,
  monitoringCount: 0,
};

export function useAssistantTravelContextGrounding(activeTripId?: string | null) {
  const tc = useTripTravelContext();

  const aligned =
    tc.enabled &&
    tc.ready &&
    Boolean(activeTripId) &&
    (!tc.tripId || tc.tripId === activeTripId);

  const grounding = useMemo(() => {
    if (!aligned) return null;
    return buildAssistantTravelContextGrounding({
      contextId: tc.contextId,
      revision: tc.revision,
      stage: tc.state?.stage,
      overviewView: tc.overviewView,
      planView: tc.planView,
      openDecisionCount: tc.openDecisionCount,
      monitoringCount: tc.monitoringCount,
    });
  }, [
    aligned,
    tc.contextId,
    tc.revision,
    tc.state?.stage,
    tc.overviewView,
    tc.planView,
    tc.openDecisionCount,
    tc.monitoringCount,
  ]);

  return {
    enabled: aligned,
    ready: aligned,
    grounding: grounding ?? EMPTY_GROUNDING,
    refresh: tc.refresh,
    openContextDiff: tc.openContextDiff,
    travelContextPayload: aligned
      ? {
          context_id: tc.contextId,
          revision: tc.revision,
          stage: tc.state?.stage,
        }
      : null,
  };
}
