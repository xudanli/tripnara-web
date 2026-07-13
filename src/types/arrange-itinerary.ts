import type { AttractionExploreCandidatesResponse } from '@/types/attraction-explore';
import type { ItineraryItemDetail } from '@/types/trip';
import type { ScheduleTimelineResponse } from '@/types/schedule-timeline';
import type {
  PlanningDecisionClusterSummary,
  PlanningDecisionExecutionStep,
  PlanningDecisionPack,
  PlanningDecisionPackOption,
  PlanningProposalMonitorView,
} from '@/types/planning-decision-pack';

export type ArrangeItineraryCommitMode = 'proposal' | 'direct';

export type ArrangeItineraryInsertMode = 'append' | 'before' | 'after';

export type ArrangeItineraryAiActionType =
  | 'fill_gaps'
  | 'optimize_route'
  | 'arrange_lunch'
  | 'reduce_intensity'
  | 'arrange_lodging';

export type ArrangeOrchestrationPhase =
  | 'IDLE'
  | 'ANALYZING'
  | 'GENERATING'
  | 'VALIDATING'
  | 'PREVIEW'
  | 'AWAITING_CONFIRMATION'
  | 'APPLYING'
  | 'COMPLETED'
  | 'CONTEXT_STALE'
  | 'FAILED';

export type PlanProposalIntent =
  | 'PLACE_CANDIDATE'
  | 'ADD_ITEM'
  | 'INSERT_REST_GAP'
  | 'AUTO_ARRANGE'
  | 'FILL_GAP'
  | 'OPTIMIZE_ROUTE'
  | 'ARRANGE_LUNCH'
  | 'REDUCE_INTENSITY'
  | 'ARRANGE_LODGING'
  | 'MOVE_ITEM';

export type ArrangePlanningMode = 'manual' | 'copilot';

export type PlanProposalValidationStatus = 'PASS' | 'WARN' | 'BLOCK';

export interface ArrangeOrchestrationState {
  tripId: string;
  phase: ArrangeOrchestrationPhase;
  activeProposalId?: string | null;
  contextVersion: number;
  message?: string;
  updatedAt?: string;
}

export interface PlanProposalValidationConflict {
  kind: string;
  message: string;
  dayIndex?: number;
  itemIds?: string[];
}

export interface PlanProposalValidation {
  status: PlanProposalValidationStatus;
  warnings: string[];
  conflicts: PlanProposalValidationConflict[];
}

export interface PlanProposalTimelineChange {
  operation: string;
  label: string;
  dayIndex?: number;
  impact?: string;
}

export interface PlanProposalDiff {
  summary: string;
  timelineChanges: PlanProposalTimelineChange[];
}

export interface PlanProposalChange {
  operation: string;
  candidateId?: string;
  placeId?: number;
  dayIndex?: number;
  startTime?: string;
  endTime?: string;
  label?: string;
  removeFromCandidates?: boolean;
}

export interface PlanProposal {
  proposalId: string;
  tripId: string;
  intent: PlanProposalIntent;
  basePlanVersion: number;
  contextVersion: number;
  affectedDays: number[];
  changes: PlanProposalChange[];
  benefits?: Record<string, unknown>;
  tradeoffs?: string[];
  validation: PlanProposalValidation;
  diff: PlanProposalDiff;
  requiresConfirmation: boolean;
  status: string;
  createdAt?: string;
  expiresAt?: string;
  /** P6 · tripnara.planning_decision_pack@v1 */
  decisionPack?: PlanningDecisionPack;
}

export interface ArrangeItinerarySuggestedAction {
  action: string;
  label: string;
  previewId?: string;
}

export interface ArrangeItineraryProposalWriteResponse {
  mode: 'proposal';
  tripId: string;
  orchestrationState: ArrangeOrchestrationState;
  proposal: PlanProposal;
  answer?: string;
  suggestedActions?: ArrangeItinerarySuggestedAction[];
}

export interface ArrangeItineraryDirectPlaceResponse {
  mode: 'direct';
  tripId: string;
  itineraryItem: ItineraryItemDetail;
  scheduleTimeline?: ScheduleTimelineResponse;
  candidates?: AttractionExploreCandidatesResponse;
}

export interface ArrangeItineraryDirectItemResponse {
  mode: 'direct';
  tripId: string;
  itineraryItem: ItineraryItemDetail;
  scheduleTimeline?: ScheduleTimelineResponse;
}

export interface ArrangeItineraryDirectAutoArrangeResponse {
  mode: 'direct';
  tripId?: string;
  taskId?: string;
  status?: string;
  itemCount?: number;
  message?: string;
}

export type PlaceCandidateResult =
  | ArrangeItineraryProposalWriteResponse
  | ArrangeItineraryDirectPlaceResponse;

export type ArrangeItineraryAddItemResult =
  | ArrangeItineraryProposalWriteResponse
  | ArrangeItineraryDirectItemResponse;

export type ArrangeItineraryInsertGapResult =
  | ArrangeItineraryProposalWriteResponse
  | ArrangeItineraryDirectItemResponse;

export type ArrangeItineraryAutoArrangeResult =
  | ArrangeItineraryProposalWriteResponse
  | ArrangeItineraryDirectAutoArrangeResponse;

export type ArrangeItineraryAiActionResult =
  | ArrangeItineraryProposalWriteResponse
  | {
      mode: 'direct';
      action: ArrangeItineraryAiActionType;
      answer: string;
      suggestedActions?: ArrangeItinerarySuggestedAction[];
      preview?: { scheduleRevision?: number; changedItemIds?: string[] };
    };

export interface PlaceCandidateRequest {
  /** 1-based，与 UI Day 1 对齐 */
  dayIndex: number;
  startTime?: string;
  endTime?: string;
  insertMode?: ArrangeItineraryInsertMode;
  anchorItemId?: string;
  removeFromCandidates?: boolean;
  commitMode?: ArrangeItineraryCommitMode;
}

export interface ArrangeItineraryAddItemRequest {
  dayIndex: number;
  type?: 'ACTIVITY' | 'REST' | 'TRANSIT' | 'MEAL';
  placeId?: number;
  startTime?: string;
  endTime?: string;
  note?: string;
  insertMode?: ArrangeItineraryInsertMode;
  anchorItemId?: string;
  forceCreate?: boolean;
  commitMode?: ArrangeItineraryCommitMode;
}

export interface ArrangeItineraryInsertGapRequest {
  dayIndex: number;
  startTime: string;
  endTime: string;
  label?: string;
  commitMode?: ArrangeItineraryCommitMode;
}

export interface ArrangeItineraryAiActionRequest {
  action: ArrangeItineraryAiActionType;
  dayIndex?: number;
  candidateIds?: string[];
  commitMode?: ArrangeItineraryCommitMode;
}

export interface ArrangeItineraryAutoArrangeRequest {
  candidateIds?: string[];
  commitMode?: ArrangeItineraryCommitMode;
}

export interface ArrangeItineraryCreateProposalRequest {
  intent: PlanProposalIntent;
  payload: Record<string, unknown>;
}

export interface ArrangeItineraryApplyProposalRequest {
  contextVersion: number;
  force?: boolean;
}

export interface ArrangeItineraryApplyProposalResponse {
  tripId: string;
  proposalId: string;
  orchestrationState?: ArrangeOrchestrationState;
  scheduleTimeline?: ScheduleTimelineResponse;
  candidates?: AttractionExploreCandidatesResponse;
  /** P6 写回步骤 */
  executionSteps?: PlanningDecisionExecutionStep[];
  validUntil?: string;
  monitorWebhookUrl?: string;
  tripVersionAfter?: string;
}

export interface ArrangeItineraryOverviewResponse {
  tripId: string;
  dayCount: number;
  nights: number;
  totalDriveMinutes: number;
  totalDistanceKm: number;
  activityCount: number;
  routeSpanKm: number;
  unplacedCandidateCount: number;
  pacingLabel?: string | null;
  transportLabel?: string | null;
  departureLabel?: string | null;
  /** P2 · 每晚住宿建议（BFF auto-arrange / overview / snapshot） */
  lodgingSuggestions?: ArrangeLodgingSuggestion[];
  accommodationStandardStars?: number;
  accommodationStandardLabel?: string;
}

/** P2 · 快照 lodgingSuggestions 单条（BFF 扁平工作台项） */
export type ArrangeLodgingWorkbenchKind = 'current' | 'alternative' | 'recommended';
export type ArrangeLodgingWorkbenchPriority = 'primary' | 'alternative' | 'recommended';

export interface ArrangeLodgingWorkbenchMeta {
  distanceFromAnchorKm?: number;
  anchorPlaceName?: string;
  driveMinutesEstimate?: number;
}

export interface ArrangeLodgingWorkbenchItem {
  id: string;
  nightIndex: number;
  dayIndex: number;
  placeId?: number | string;
  name: string;
  kind: ArrangeLodgingWorkbenchKind;
  priority?: ArrangeLodgingWorkbenchPriority;
  coordinates?: { lat: number; lng: number };
  reason?: string;
  meta?: ArrangeLodgingWorkbenchMeta;
}

/** P2 · 单晚住宿建议候选 */
export interface ArrangeLodgingSuggestionCandidate {
  id: string;
  name: string;
  placeId?: number | string;
  lat?: number;
  lng?: number;
  stars?: number;
  priceTierLabel?: string;
  /** 相对当前方案的次日车程变化（分钟，负值=更省） */
  nextDayDriveMinutesDelta?: number;
  nextDayDriveMinutes?: number;
  matchScore?: number;
  url?: string;
  applySnapshot?: Record<string, unknown>;
  recommended?: boolean;
  /** BFF 工作台项 kind / priority */
  kind?: ArrangeLodgingWorkbenchKind;
  priority?: ArrangeLodgingWorkbenchPriority;
  reason?: string;
  distanceFromAnchorKm?: number;
  anchorPlaceName?: string;
  driveMinutesEstimate?: number;
}

/** P2 · 单晚住宿建议 */
export interface ArrangeLodgingSuggestion {
  /** 1-based，与 BFF dayIndex 对齐 */
  dayIndex: number;
  dayNumber?: number;
  dateLabel?: string;
  status: 'missing' | 'suggested' | 'booked';
  currentLabel?: string;
  currentItemId?: string;
  candidates: ArrangeLodgingSuggestionCandidate[];
  recommendationReason?: string;
  accommodationStandardHint?: string;
}

export interface ArrangeLodgingSuggestionsBundle {
  suggestions: ArrangeLodgingSuggestion[];
  accommodationStandardStars?: number;
  accommodationStandardLabel?: string;
  source: 'bff' | 'client_projection';
}

export interface ArrangePlanningModeResponse {
  tripId: string;
  mode: ArrangePlanningMode;
  updatedAt?: string;
}

export interface ArrangeItemLockEntry {
  itemId: string;
  label?: string;
  dayIndex?: number;
  reason?: string;
}

export interface ArrangeItemLocksResponse {
  tripId: string;
  lockedItems: ArrangeItemLockEntry[];
  semiLockedItems: ArrangeItemLockEntry[];
  mustVisitItems: ArrangeItemLockEntry[];
  movableItems: ArrangeItemLockEntry[];
}

export interface AnalyzeMoveItemRequest {
  dayIndex: number;
  startTime: string;
  endTime: string;
  commitMode?: ArrangeItineraryCommitMode;
}

export type AnalyzeMoveItemResult = ArrangeItineraryProposalWriteResponse | ArrangeItineraryDirectItemResponse;

export type CopilotSuggestionKind =
  | 'pending_proposal'
  | 'unarranged_must_visit'
  | 'high_detour_candidate'
  | 'schedule_gap'
  | 'suggest_lodging_for_day';

export type CopilotActionHintType =
  | 'place-proposal'
  | 'fill_gaps'
  | 'optimize_route'
  | 'review_proposal'
  | 'suggest_lodging'
  | 'apply_lodging_suggestion'
  | string;

export interface CopilotActionHint {
  type: CopilotActionHintType;
  label?: string;
  placeId?: number | string;
  candidateId?: string;
  dayIndex?: number;
  itemId?: string;
  proposalId?: string;
}

export interface CopilotSuggestion {
  id: string;
  kind: CopilotSuggestionKind;
  title: string;
  message: string;
  severity?: 'info' | 'warn' | 'action';
  actionHint?: CopilotActionHint;
  /** P6 · 与 decisionPack.options[] 同构 */
  option?: PlanningDecisionPackOption;
}

export interface CopilotSuggestionsResponse {
  tripId: string;
  suggestions: CopilotSuggestion[];
  generatedAt?: string;
}

export type CopilotActionType =
  | 'draft_for_candidate'
  | 'draft_all_must_go'
  | 'fill_gaps'
  | 'execute_suggestion';

export interface CopilotActionRequest {
  action: CopilotActionType;
  candidateId?: string;
  suggestionId?: string;
  dayIndex?: number;
}

export type CopilotActionResult = ArrangeItineraryProposalWriteResponse;

export interface PlanningWorkbenchItemLocksSummary {
  lockedCount: number;
  semiLockedCount: number;
  mustVisitCount: number;
  movableCount: number;
}

export interface PlanningWorkbenchSnapshot {
  tripId: string;
  planningMode: ArrangePlanningMode;
  orchestrationState: ArrangeOrchestrationState;
  overview?: Pick<
    ArrangeItineraryOverviewResponse,
    | 'dayCount'
    | 'nights'
    | 'activityCount'
    | 'totalDriveMinutes'
    | 'totalDistanceKm'
    | 'routeSpanKm'
    | 'unplacedCandidateCount'
  >;
  itemLocksSummary?: PlanningWorkbenchItemLocksSummary;
  conflictCount?: number;
  copilotSuggestions: CopilotSuggestion[];
  /** P6 · 待确认草案的决策簇摘要 */
  decisionClusters?: PlanningDecisionClusterSummary[];
  pendingProposalCount?: number;
  updatedAt?: string;
  lodgingSuggestions?: ArrangeLodgingSuggestion[];
  accommodationStandardStars?: number;
  accommodationStandardLabel?: string;
}

export function isArrangeProposalWriteResponse(
  value: unknown,
): value is ArrangeItineraryProposalWriteResponse {
  return (
    value != null &&
    typeof value === 'object' &&
    (value as ArrangeItineraryProposalWriteResponse).mode === 'proposal' &&
    Boolean((value as ArrangeItineraryProposalWriteResponse).proposal?.proposalId)
  );
}
