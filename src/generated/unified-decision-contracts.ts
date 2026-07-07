/**
 * Unified Decision 类型包（与 BFF Gateway 契约对齐）。
 * 校验：`npm run contracts:unified-decision`
 */
export type {
  CanonicalAuthorizeRequest,
  CanonicalAuthorizeResponse,
  CanonicalEvaluateResponse,
  CanonicalExecuteResponse,
  CanonicalL2Phase,
  DecisionRouteView,
  Rfc001CandidateView,
  Rfc001EvaluateCandidateView,
  Rfc001UtilityEvaluationRow,
  NormalizedCanonicalEvaluateResponse,
  Rfc001DecisionCenterProblemView,
  Rfc001DecisionCenterTripView,
  Rfc001DecisionRecordView,
  Rfc001PlanVersionView,
  Rfc001ProblemCoreView,
  Rfc001SemanticCapability,
  TripDecisionProblemRouteView,
  TripDecisionRoutingView,
  UnifiedDecisionActivePacks,
  UnifiedDecisionCenterView,
  UnifiedDecisionProblemCanonicalSummary,
  UnifiedDecisionProblemLegacySummary,
  UnifiedDecisionProblemListItem,
  UnifiedDecisionProblemListMeta,
  UnifiedDecisionProblemListView,
  UnifiedDecisionProblemFlow,
  UnifiedGatewayEnvelope,
  UnifiedProblemFlow,
  UnifiedDecisionActivePacksLayer,
  ProactiveDetectionProblemRef,
  WeatherHazardPollRequest,
  WeatherHazardPollResponse,
  DailyLoadScanRequest,
  DailyLoadScanResponse,
  UnifiedDecisionProblemDetailView,
  UnifiedDecisionOptionsView,
  UnifiedDecisionCenterOverviewView,
  DecisionAction,
  DecisionWriteChain,
  DecisionActionability,
  DecisionWorkflowStatus,
  DecisionExecutionStatusSurface,
  DecisionProblemResolutionView,
  DecisionResolutionStatus,
  SubmitDecisionResolutionRequest,
  SubmitDecisionResolutionResponse,
  ApplyDecisionProblemResponse,
  DecisionProblemApplyAcceptedView,
  DecisionProblemApplyTaskView,
  CreateDecisionCollaborativeSubTaskRequest,
  CreateDecisionCollaborativeSubTaskResponse,
  DecisionCollaborativeSubTaskView,
  DecisionCollaborativeSubTaskKind,
  ListDecisionCollaborativeSubTasksResponse,
  PatchDecisionCollaborativeSubTaskRequest,
  PatchDecisionCollaborativeSubTaskResponse,
  UpdateDecisionCollaborativeSubTaskRequest,
  UpdateDecisionCollaborativeSubTaskResponse,
  ApplyDecisionCollaborativeTaskView,
} from '@/types/unified-decision';

export {
  resolveDecisionWriteChain,
  resolveSummaryWriteChain,
  resolveDetailWriteChain,
  isEvaluateAuthorizeExecuteChain,
  isApplyAndPollChain,
  writeChainFromLegacyFlow,
  legacyFlowFromWriteChain,
} from '@/lib/decision-write-chain.util';

export {
  filterDecisionQueueSummaries,
  isReadinessSafetyDecisionProblem,
} from '@/lib/decision-problem-queue-filter.util';

export {
  assertDecisionSurfaceCountsAligned,
  assertEntityInBothSurfaces,
} from '@/lib/decision-surface-count-alignment.util';

export {
  formatDecisionListBadgeLabel,
  pickListMetaForBadge,
  resolveDecisionListBadgeCount,
} from '@/lib/decision-list-badge.util';

export { decisionActionSourceLabel, DECISION_ACTION_SOURCE_LABELS } from '@/lib/decision-problem-display.util';

export {
  DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID,
  decisionCollaborativeSubTaskKindLabel,
  labelForCollaborativeSubTaskStatus,
  DECISION_COLLAB_SUBTASK_STATUS_OPTIONS,
  DECISION_COLLABORATIVE_SUB_TASK_KIND_LABELS,
  /** @deprecated 使用 DECISION_COLLAB_SUBTASK_STATUS_OPTIONS */
  DECISION_COLLABORATIVE_SUB_TASK_STATUS_LABELS,
  /** @deprecated 使用 labelForCollaborativeSubTaskStatus */
  decisionCollaborativeSubTaskStatusLabel,
  decisionCollaborativeSubTasksQueryKey,
  normalizeCollaborativeSubTaskStatus,
  normalizeDecisionCollaborativeSubTask,
  normalizeListDecisionCollaborativeSubTasksResponse,
  normalizeCreateDecisionCollaborativeSubTaskResponse,
  normalizePatchDecisionCollaborativeSubTaskResponse,
  normalizeSuggestedSubTasks,
  resolveAutoSuggestedSubTaskKinds,
  buildSuggestedSubTasks,
  previewCollaborativeFollowUps,
} from '@/lib/decision-collaborative-sub-task.util';

export type { CollaborativeFollowUpPreview } from '@/lib/decision-collaborative-sub-task.util';

export {
  buildResolutionIdempotencyKey,
  normalizeDecisionProblemResolution,
  normalizeSubmitDecisionResolutionResponse,
  normalizeApplyDecisionProblemResponse,
  normalizeSubmitResolutionRequest,
  resolveDecisionResolutionCtaPhase,
  writeChainSubmitHint,
  decisionProblemWriteQueryKeys,
  resolveDecisionProblemTaskBinding,
} from '@/lib/decision-resolution.util';

export {
  submitDecisionResolution,
  applyDecisionProblemToTrip,
  submitAndApplyDecisionResolution,
} from '@/lib/decision-apply-action.util';

export {
  pollDecisionProblemApplyUntilSettled,
  pollDecisionProblemApplyTask,
  isApplyRevalidationSettled,
  isRevalidationPending,
  isDecisionExecutionApplied,
  inferExecutionStatusAfterApply,
  APPLY_REVALIDATION_POLL_INTERVAL_MS,
  MAX_APPLY_REVALIDATION_POLL_ATTEMPTS,
  DEFAULT_APPLY_TASK_POLL_INTERVAL_MS,
  MAX_APPLY_TASK_POLL_ATTEMPTS,
} from '@/lib/decision-apply-polling.util';

export {
  normalizeApplyAcceptedResponse,
  normalizeApplyTaskResponse,
  resolveApplyTaskPollPath,
  applyTaskStatusMessage,
  isAsyncApplyUnsupportedError,
} from '@/lib/decision-apply-task.util';

export type { StartApplyProblemDecisionResult } from '@/lib/decision-apply-task.util';

export {
  normalizeDecisionAction,
  normalizeDecisionActions,
  resolveDetailActions,
  mapOptionsToDecisionActions,
} from '@/lib/decision-action.util';

export type {
  CandidateComparisonView,
  CandidateComparisonRow,
  CandidateComparisonOriginalIntent,
  CandidateComparisonRejection,
} from '@/types/candidate-comparison';

export {
  extractComparisonViewFromPayload,
  normalizeCandidateComparisonView,
} from '@/lib/candidate-comparison-view.util';

export {
  formatImpactScopeChainLink,
  formatImpactScopeHeadline,
  formatImpactScopeList,
  formatImpactScopeNarrative,
  formatImpactScopeTrigger,
  resolveImpactScopeDays,
  dayLabelForDecisionContext,
  stripEmbeddedDayFromDecisionTitle,
  formatDecisionDayLabel,
} from '@/lib/impact-scope-i18n.util';

export {
  extractImpactScopeFromPayload,
  impactScopeHeadline,
  normalizeImpactScopeView,
} from '@/lib/impact-scope-view.util';

export type {
  ImpactScopeView,
  ImpactScopeChainLink,
  ImpactScopeArrangement,
  ImpactScopeTrigger,
  ImpactScopeNarrative,
  ImpactScopeConsequenceKind,
} from '@/types/impact-scope';

export {
  isUnifiedDecisionProblemListView,
  mapUnifiedDecisionProblemList,
  unifiedListItemToSummary,
} from '@/lib/unified-decision-problem-list.util';

export {
  activePackLayerIds,
  destinationPackId,
  formatActivePacksSummary,
} from '@/lib/unified-decision-active-packs.util';

export {
  findEvaluateCandidate,
  normalizeCanonicalEvaluateResponse,
  summarizeExcludedEvaluateCandidates,
} from '@/lib/canonical-evaluate-response.util';

export {
  isUnifiedGatewayEnvelope,
  normalizeGatewayOptionsResponse,
  normalizeGatewayPreviewResponse,
  normalizeGatewayProblemDetail,
  shouldBlockLegacyDecisionCreate,
  unwrapUnifiedGatewayEnvelope,
  type GatewayDecisionOptionsResult,
  type GatewayDecisionPreviewResult,
  type GatewayDecisionProblemDetailResult,
} from '@/lib/unified-gateway-response.util';

export type {
  CausalTraceReference,
  CausalStoryView,
  CausalStoryChainNode,
  CausalStoryRecommendedOption,
  CausalTraceReplayView,
  CanonicalCausalTraceV1,
} from '@/types/causal-trace';

export {
  normalizeCausalTraceReference,
  normalizeCausalStoryView,
  normalizeCausalTraceReplayView,
  extractCausalTraceFromPayload,
  resolveCausalTraceRefForSubmit,
  hasGatewayCausalStoryView,
} from '@/lib/causal-trace-view.util';

export {
  CANONICAL_L2_PHASE_CTA,
  CANONICAL_L2_PHASE_LABELS,
  buildCanonicalExecuteIdempotencyKey,
  classifyCanonicalL2Phase,
  resolveCanonicalPrimaryCta,
  resolveDisplayCanonicalL2Phase,
  isCanonicalL2Problem,
  isCanonicalSemanticCapability,
  personaLabelForSemanticCapability,
  resolveProblemFlow,
  routeResolutionLabel,
  shouldRefreshItineraryAfterCanonicalExecute,
  titleForSemanticCapability,
  type ProblemFlowKind,
} from '@/trips/decision-runtime/gateway/frontend/canonical-decision-l2-state-machine.util';
