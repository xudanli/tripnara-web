/** Plan Gate BFF 契约（uiOutput.planGate / readiness / pipeline） */

export type PlanGateOverallStatus =
  | 'pass'
  | 'suggest_adjust'
  | 'need_confirm'
  | 'blocked'
  | 'insufficient_data';

export type PlanGateDimensionKey =
  | 'safetyFeasibility'
  | 'paceLoad'
  | 'experienceCompleteness';

export type PlanGateSubmitMode =
  | 'ready'
  | 'pending_confirmations'
  | 'blocked'
  | 'insufficient_data';

export type PlanGatePipelineStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting';

export interface PlanGateVerificationCheck {
  label?: string;
  status?: string;
  detail?: string;
  description?: string;
}

export interface PlanGateVerificationDimensionDto {
  key: PlanGateDimensionKey | string;
  title: string;
  status: PlanGateOverallStatus;
  summary?: string;
  checks?: PlanGateVerificationCheck[];
}

export interface PlanGateTradeOffOption {
  id: string;
  label: string;
  description?: string;
}

export interface PlanGatePendingConfirmation {
  id: string;
  title: string;
  description: string;
  kind: 'sign_off' | 'trade_off';
  options?: PlanGateTradeOffOption[];
}

export interface PlanGateVerificationMetrics {
  executability?: number;
  executabilityDelta?: number;
  budgetPerPerson?: number;
  budgetPerPersonDelta?: number;
  totalBudget?: number;
  totalDrivingMinutes?: number;
  totalDrivingMinutesDelta?: number;
  affectedDayCount?: number;
  memberCount?: number;
  currency?: string;
}

export interface PlanGateVerificationProjection {
  draftLabel: string;
  overallStatus: PlanGateOverallStatus;
  dimensions: PlanGateVerificationDimensionDto[];
  pendingConfirmations?: PlanGatePendingConfirmation[];
  metrics?: PlanGateVerificationMetrics;
  headline?: string;
}

export interface PlanGateSubmitEligibility {
  mode: PlanGateSubmitMode;
  canSubmitToTimeline: boolean;
  canSubmitWithAcceptedRisk: boolean;
  blockers: string[];
  requiredConfirmationIds: string[];
  satisfiedConfirmationIds: string[];
}

export interface PlanGateTimelineChange {
  kind: string;
  day?: number;
  label?: string;
  before?: string;
  after?: string;
  impact?: 'low' | 'medium' | 'high' | string;
}

export interface PlanGateDraftDiffMetrics {
  executability?: number;
  executabilityDelta?: number;
  budgetPerPerson?: number;
  budgetPerPersonDelta?: number;
  totalDrivingMinutes?: number;
  totalDrivingMinutesDelta?: number;
  affectedDays?: number;
  memberCount?: number;
  currency?: string;
}

export interface PlanGateMapChange {
  day?: number;
  label?: string;
  changeType?: string;
  distanceKmDelta?: number;
}

export type PlanGateRiskChangeKind = 'resolved' | 'new' | 'retained' | 'pending';

export interface PlanGateRiskChange {
  kind: PlanGateRiskChangeKind | string;
  label: string;
}

export interface PlanGateMapGeoJsonLegendItem {
  key: string;
  label: string;
  color: string;
}

/** Mapbox / MapLibre 可直接渲染的 GeoJSON + 图例与 bounds */
export interface PlanGateMapGeoJson {
  type: 'FeatureCollection';
  features: GeoJSON.Feature[];
  legend?: PlanGateMapGeoJsonLegendItem[];
  bounds?: [number, number, number, number];
}

export interface PlanGatePreTripTask {
  id: string;
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low' | string;
  source: string;
  day?: number;
}

export interface PlanGatePreTripTasks {
  total: number;
  highPriority: number;
  tasks: PlanGatePreTripTask[];
}

export type PlanGateMemberChangeKind =
  | 'split_added'
  | 'split_removed'
  | 'meetup_changed'
  | 'branch_changed'
  | 'member_assignment_changed';

export interface PlanGateMemberChange {
  day: number;
  kind: PlanGateMemberChangeKind | string;
  label: string;
  before?: string;
  after?: string;
  impact: 'low' | 'medium' | 'high';
  missingMeetup?: boolean;
}

export interface PlanGateFeasibilityResponse {
  baselineScore?: number;
  draftScore?: number;
  executabilityDelta?: number;
  planId?: string;
  source?: string;
}

export interface PlanGateDraftDiff {
  baselinePlanId?: string;
  baselineLabel?: string;
  draftPlanId?: string;
  draftLabel?: string;
  timelineChanges?: PlanGateTimelineChange[];
  metrics?: PlanGateDraftDiffMetrics;
  mapChanges?: PlanGateMapChange[];
  mapGeoJson?: PlanGateMapGeoJson;
  memberChanges?: PlanGateMemberChange[];
  riskChanges?: PlanGateRiskChange[];
  changeLog?: string[];
  affectedDayCount?: number;
}

export interface PlanGateMetricDelta {
  from?: number;
  to?: number;
  delta?: number;
}

export interface PlanGateCommitResultMetrics {
  executability?: PlanGateMetricDelta;
  budgetPerPerson?: PlanGateMetricDelta;
  totalDrivingMinutes?: PlanGateMetricDelta;
  affectedDays?: PlanGateMetricDelta;
}

export interface PlanGateNextAction {
  label: string;
  action: string;
}

export interface PlanGateTimelineMaterialization {
  added?: number;
  modified?: number;
  removed?: number;
  partialCommit?: boolean;
  commitDays?: number[];
  /** 物化失败时降级为 PROPOSED，不阻塞主流程 */
  degradedToProposed?: boolean;
}

export interface PlanGateCommitResult {
  success: boolean;
  committedPlanId?: string;
  committedVersionLabel?: string;
  committedAt?: string;
  headline?: string;
  updates?: string[];
  metrics?: PlanGateCommitResultMetrics;
  /** @deprecated 优先使用 preTripTasks.total */
  preTripTasksCount?: number;
  preTripTasks?: PlanGatePreTripTasks;
  timelineMaterialization?: PlanGateTimelineMaterialization;
  nextActions?: PlanGateNextAction[];
}

export interface PlanGateUiOutput {
  verification: PlanGateVerificationProjection;
  submitEligibility: PlanGateSubmitEligibility;
  draftDiff?: PlanGateDraftDiff;
  preTripTasks?: PlanGatePreTripTasks;
  commitResult?: PlanGateCommitResult;
}

/** commit 请求体 confirmedItems 项 */
export interface PlanGateConfirmedItemPayload {
  confirmationId: string;
  accepted: boolean;
  choiceId?: string;
}

export interface PlanGatePipelineStep {
  id: string;
  label: string;
  status: PlanGatePipelineStepStatus;
  order?: number;
}

export interface PlanGateReadinessResponse {
  confirmedConstraintCount?: number;
  decisionConclusionCount?: number;
  budgetPerPerson?: number;
  budgetCurrency?: string;
  memberCount?: number;
  missingInfoCount?: number;
  blockers?: string[];
  warnings?: string[];
  canGenerateDraft?: boolean;
}

/** GET .../plan-gate/pre-trip-tasks 响应（与 execute 内 preTripTasks 同形） */
export type PlanGatePreTripTasksResponse = PlanGatePreTripTasks;

/** GET .../plan-gate/feasibility 响应 */
export type PlanGateFeasibilityApiResponse = PlanGateFeasibilityResponse;

export interface PlanGateUserConfirmationState {
  confirmationId: string;
  accepted: boolean;
  choiceId?: string;
}
