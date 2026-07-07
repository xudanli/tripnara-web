/**
 * 编排行程 BFF — 前端集成入口（命名与 handoff 对齐）
 */
import { arrangeItineraryApi } from '@/api/arrange-itinerary';
import type {
  ArrangeItineraryApplyProposalRequest,
  ArrangeItineraryApplyProposalResponse,
  ArrangeOrchestrationState,
  CopilotActionRequest,
  CopilotActionResult,
  CopilotSuggestionsResponse,
  PlanProposal,
  PlanningWorkbenchSnapshot,
} from '@/types/arrange-itinerary';
import type { PlanningProposalMonitorView } from '@/dto/frontend-planning-decision-pack.types';

export type {
  PlanningDecisionPack,
  PlanningDecisionPackOption,
  PlanningDecisionCluster,
  PlanningDecisionClusterSummary,
  PlanningDecisionDiagnostic,
  PlanningDecisionExecutionStep,
  PlanningProposalMonitorView,
} from '@/dto/frontend-planning-decision-pack.types';

export {
  pickRecommendedOption,
  sortDecisionClusters,
  sortDecisionClusterSummaries,
  summarizeOptionImpact,
  summarizeImpactScope,
  diagnosticCountFromPack,
  mergeDiagnosticsWithTripConflicts,
  mergePackDiagnosticsWithTripConflicts,
  isTripConflictsOption,
  optionKindLabel,
  clusterDiagnosticTotal,
} from '@/dto/frontend-planning-decision-card.util';

export {
  DATA_BASIS_ICON_KEYS,
  getOptionBadge,
  getOptionDisplayTitle,
  getOptionLetter,
  getRecommendedOption,
  resolveDataBasisIcon,
  resolveOptionCostItems,
  resolveOptionOutcomeItems,
} from '@/dto/frontend-planning-decision-option.util';

export type {
  PlanningDecisionCostItem,
  PlanningDecisionDataBasisItem,
  PlanningDecisionOption,
  PlanningDecisionOutcomeItem,
} from '@/dto/frontend-planning-decision-pack.types';

export async function fetchPlanningWorkbenchSnapshot(
  tripId: string,
): Promise<PlanningWorkbenchSnapshot> {
  return arrangeItineraryApi.getPlanningWorkbenchSnapshot(tripId);
}

export async function fetchCopilotSuggestions(tripId: string): Promise<CopilotSuggestionsResponse> {
  return arrangeItineraryApi.getCopilotSuggestions(tripId);
}

export async function getPlanProposal(tripId: string, proposalId: string): Promise<PlanProposal> {
  return arrangeItineraryApi.getProposal(tripId, proposalId);
}

export async function applyPlanProposal(
  tripId: string,
  proposalId: string,
  payload: ArrangeItineraryApplyProposalRequest,
): Promise<ArrangeItineraryApplyProposalResponse> {
  return arrangeItineraryApi.applyProposal(tripId, proposalId, payload);
}

export async function discardPlanProposal(
  tripId: string,
  proposalId: string,
): Promise<ArrangeOrchestrationState> {
  return arrangeItineraryApi.discardProposal(tripId, proposalId);
}

export async function fetchProposalMonitor(
  tripId: string,
  proposalId: string,
): Promise<PlanningProposalMonitorView> {
  return arrangeItineraryApi.getProposalMonitor(tripId, proposalId);
}

export async function runCopilotAction(
  tripId: string,
  payload: CopilotActionRequest,
): Promise<CopilotActionResult> {
  return arrangeItineraryApi.runCopilotAction(tripId, payload);
}

export type {
  PlanningCausalChain,
  PlanningCausalChainNode,
  PlanningCausalChainSeverity,
} from '@/dto/frontend-planning-causal-chain.types';

export {
  CAUSAL_CHAIN_SEVERITY_COLORS,
  formatCausalChainBasisAge,
  planningCausalChainNodesFromCheckerCascade,
  sortCausalChainNodes,
} from '@/dto/frontend-planning-causal-chain.types';

export async function fetchDecisionCausalChain(
  tripId: string,
  params?: { proposalId?: string; problemId?: string; optionId?: string },
): Promise<import('@/dto/frontend-planning-causal-chain.types').PlanningCausalChain> {
  return arrangeItineraryApi.getDecisionCausalChain(tripId, params);
}

export type {
  PlanningDecisionBasis,
  PlanningDecisionBasisContextField,
  PlanningDecisionBasisWhatHappened,
} from '@/dto/frontend-planning-decision-basis.types';

export {
  DECISION_BASIS_FIELD_ICON_KEYS,
  decisionBasisFieldValueClass,
  formatDecisionBasisUpdatedAge,
  resolveDecisionBasisFieldIcon,
} from '@/dto/frontend-planning-decision-basis.types';

export async function fetchDecisionBasis(
  tripId: string,
  params?: { conflictId?: string; proposalId?: string },
): Promise<import('@/dto/frontend-planning-decision-basis.types').PlanningDecisionBasis> {
  return arrangeItineraryApi.getDecisionBasis(tripId, params);
}

export type {
  PlanningDecisionInspector,
  PlanningDecisionInspectorFeasibility,
  PlanningDecisionInspectorFetchParams,
  PlanningDecisionInspectorMemberConsensus,
  PlanningDecisionInspectorPlanDiff,
  PlanningDecisionInspectorTabEmptyState,
} from '@/dto/frontend-planning-decision-inspector.types';

export async function fetchDecisionInspector(
  tripId: string,
  params: import('@/dto/frontend-planning-decision-inspector.types').PlanningDecisionInspectorFetchParams,
): Promise<import('@/dto/frontend-planning-decision-inspector.types').PlanningDecisionInspector> {
  return arrangeItineraryApi.getDecisionInspector(tripId, params);
}

export type {
  DecisionSpaceBundle,
  DecisionSpaceBundleFetchParams,
  DecisionSpaceBundleFetchResult,
  DecisionSpaceBundleIncludeField,
  DecisionSpaceBundleMeta,
  DecisionSpaceBundleSurface,
} from '@/dto/frontend-decision-space-bundle.types';

export {
  decisionSpaceBundleApi,
  isDecisionSpaceBundleRecoverableError,
} from '@/api/decision-space-bundle';

export async function fetchDecisionSpaceBundle(
  tripId: string,
  params: import('@/dto/frontend-decision-space-bundle.types').DecisionSpaceBundleFetchParams,
  options?: { signal?: AbortSignal; ifNoneMatch?: string },
): Promise<import('@/dto/frontend-decision-space-bundle.types').DecisionSpaceBundleFetchResult> {
  const { decisionSpaceBundleApi } = await import('@/api/decision-space-bundle');
  return decisionSpaceBundleApi.getBundle(tripId, params, options);
}

export async function fetchDecisionSpaceBundleDelta(
  tripId: string,
  params: import('@/dto/frontend-decision-space-bundle.types').DecisionSpaceBundleFetchParams & {
    problemId: string;
    include: import('@/dto/frontend-decision-space-bundle.types').DecisionSpaceBundleIncludeField[] | string;
  },
  options?: { signal?: AbortSignal; ifNoneMatch?: string; since?: string },
): Promise<import('@/dto/frontend-decision-space-bundle.types').DecisionSpaceBundleFetchResult> {
  const { decisionSpaceBundleApi } = await import('@/api/decision-space-bundle');
  return decisionSpaceBundleApi.getDelta(tripId, params, options);
}
