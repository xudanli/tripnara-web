import type {
  CandidatesBundle,
  ExplorationScenarioDetail,
} from '@/features/exploration/api/types';
import type { ExplorationViewData } from '@/travel-context/views/exploration-view.types';
import { resolveCompareDimensionsFromPayload } from '@/features/exploration/lib/compare-dimensions.util';

export function explorationViewToScenarioDetail(
  contextId: string,
  data: ExplorationViewData,
): ExplorationScenarioDetail {
  return {
    scenarioId: data.scenarioId ?? contextId,
    sessionId: data.sessionId ?? '',
    tripId: data.tripId,
    researchProtocolId: data.researchProtocolId,
    materializationStatus: data.materializationStatus,
    assignedVariant: data.assignedVariant,
    lockedFields: data.lockedFields ?? [],
    candidatesStatus: data.candidatesStatus,
    scenario: data.scenario ?? {},
  };
}

export function explorationViewToCandidatesBundle(data: ExplorationViewData): CandidatesBundle {
  const candidates = data.candidates ?? data.compare?.candidates ?? [];
  const payload = {
    candidates,
    generationVersion: data.generationVersion ?? data.candidatesStatus?.generationVersion ?? 0,
    generationMode: data.generationMode ?? data.compare?.generationMode ?? data.candidatesStatus?.generationMode,
    dimensions: data.dimensions ?? data.compare?.dimensions,
  };
  const dimensions = resolveCompareDimensionsFromPayload(payload, candidates);
  return {
    candidates,
    generationVersion: typeof payload.generationVersion === 'number' ? payload.generationVersion : 0,
    generationMode: payload.generationMode,
    dimensions: dimensions.length ? dimensions : undefined,
  };
}
