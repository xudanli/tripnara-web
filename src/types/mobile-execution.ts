/** Mobile BFF — 行中 execution-alerts / adjustment-queue（Web P2） */

export type ExecutionAlertLevel = 'STOP' | 'REPLAN_REQUIRED' | 'AT_RISK';
export type ExecutionAlertRequiredAction = 'STOP' | 'REPLAN' | 'NONE' | 'ACKNOWLEDGE';

export type ExecutionInterventionType =
  | 'SAFETY_INTERVENTION'
  | 'DYNAMIC_REPLAN'
  | 'TEAM_COORDINATION'
  | 'EXECUTION_PREPARATION';

export type ExecutionInterventionStatus =
  | 'OPEN'
  | 'SNOOZED'
  | 'ACCEPTED'
  | 'DISMISSED'
  | 'APPLYING'
  | 'RESOLVED'
  | 'FAILED'
  | 'EXPIRED';

export interface ExecutionUserNarrativeDto {
  whatHappened: string;
  impactOnTrip: string;
  recommendation: string;
  affected?: {
    activities?: Array<{ label: string; time?: string }>;
    route?: string;
    reservation?: { label: string; time: string };
  };
}

export interface ExecutionUserActionDto {
  label: string;
  action: string;
  actionId?: string;
  enabled: boolean;
  role: 'primary' | 'secondary' | 'defer';
}

export interface ExecutionInterventionCausalNodeDto {
  id: string;
  label: string;
  detail?: string;
}

export interface ExecutionInterventionCausalChainDto {
  headline?: string;
  assessment?: string;
  nodes?: ExecutionInterventionCausalNodeDto[];
}

export interface ExecutionAlertDto {
  id: string;
  riskId?: string;
  level: ExecutionAlertLevel;
  title: string;
  reason: string;
  impact: string;
  recommendedAction?: string;
  affectedActivities: string[];
  requiresImmediateAttention: boolean;
  decisionProblemIds?: string[];
  recommendationIds?: string[];
  causalChain?: ExecutionInterventionCausalChainDto;
  userNarrative?: ExecutionUserNarrativeDto;
  userActions?: ExecutionUserActionDto[];
  observedAt: string;
}

export interface ExecutionAlertsDto {
  schemaId: 'tripnara.execution_alerts@v2' | 'tripnara.execution_alerts@v1';
  tripId: string;
  contextVersion: number;
  requiredAction?: ExecutionAlertRequiredAction;
  banner?: { level: ExecutionAlertLevel; title: string; detail: string };
  primaryRisk?: ExecutionAlertDto;
  impacts?: Array<{ id: string; type: string; label: string; sourceRiskId?: string }>;
  independentRisks?: ExecutionAlertDto[];
  alerts: ExecutionAlertDto[];
  aiRecommendation: {
    title: string;
    detail: string;
    evidenceIds: string[];
    headline?: string;
  };
}

export interface ExecutionInterventionDto {
  schemaId: 'tripnara.execution_intervention@v1';
  id: string;
  type: ExecutionInterventionType;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  reason: string;
  recommendedAction: string;
  status: ExecutionInterventionStatus;
  decisionProblemId?: string;
  /** Slip / 日程不可行决策 — 须走 canonical accept-recommended */
  semanticCapability?: string;
  linkedRiskIds?: string[];
  primaryRiskId?: string;
  recommendationId?: string;
  modifiesEffectivePlan: boolean;
  requiresRevalidation: boolean;
  actions: {
    primary: { label: string; action: string; actionId?: string; enabled: boolean };
    secondary: { label: string; action: string; actionId?: string; enabled: boolean };
    defer?: { label: string; action: string; actionId?: string; enabled: boolean };
  };
  causalChain: ExecutionInterventionCausalChainDto;
  recommendation?: {
    title: string;
    summary?: string;
    keeps: string[];
    costs: string[];
    recommendedActionId?: string;
    basePlanVersionId?: string;
  };
  userNarrative?: ExecutionUserNarrativeDto;
  userActions?: ExecutionUserActionDto[];
}

export interface ExecutionAdjustmentQueueDto {
  schemaId: 'tripnara.execution_adjustment_queue@v1';
  tripId: string;
  contextVersion: number;
  pendingCount: number;
  criticalCount: number;
  highPriorityCount: number;
  headline: string;
  items: ExecutionInterventionDto[];
  countsByType: Record<ExecutionInterventionType, number>;
  linkedActiveRiskCount?: number;
}

export interface TepRepairAcceptResponse {
  contextVersion: number;
  decisionStatus: 'accepted';
  previewSummary: string;
  result: {
    planVersionId: string;
    parentPlanVersionId: string;
    appliedOptionId: string;
    appliedAction: 'REMOVE' | 'REPLACE';
    removedRefs: string[];
    removedItemIds: string[];
    createdItemIds?: string[];
    replacementPoiId?: string;
    idempotentReplay: boolean;
    itineraryMaterialized: boolean;
    executabilityRefreshed: boolean;
  };
}

export interface TepRepairAcceptRequest {
  optionId?: string;
  basePlanVersionId?: string;
  comment?: string;
}

export interface MobileDecisionAcceptRequest {
  actionId?: string;
  optionId?: string;
  comment?: string;
}

export interface ExecutionRiskRecommendationDto {
  id: string;
  title: string;
  summary?: string;
}

export interface ExecutionRiskRecommendationsDto {
  items: ExecutionRiskRecommendationDto[];
}

export interface ExecutionCausalTraceDto {
  interventionId: string;
  nodes: ExecutionInterventionCausalNodeDto[];
}

export type InterventionWriteBranch = 'tep' | 'decision' | 'slip' | 'risk';

/** ── P3: execution-overview / context / today-itinerary / departure-slip ── */

export interface MobileExecutionOverviewMetricDto {
  id: string;
  icon: string;
  title: string;
  value: string;
  detail: string;
}

export interface MobileExecutionOverviewStatusRowDto {
  id: 'risk' | 'adjust' | 'progress';
  icon: string;
  title: string;
  badgeCount?: number;
  detail: string;
  progress?: number;
  style: 'risk' | 'adjustment' | 'progress';
}

export interface MobileExecutionOverviewDto {
  tripName: string;
  dayLabel: string;
  lifecycleLabel: string;
  isExecuting: boolean;
  contextVersion: number;
  currentActivity: {
    title: string;
    subtitle: string;
    locationName: string;
    meetingPoint: string;
    meetingTime: string;
    estimatedArrival: string;
    remainingTime: string;
    progress: number;
    imageUrl?: string | null;
    currentLocationName?: string | null;
  };
  metrics: MobileExecutionOverviewMetricDto[];
  team: {
    activeCount: number;
    totalCount: number;
    summary: string;
    members: Array<{ id: string; name: string; role: string; status: string }>;
  };
  statusRows: MobileExecutionOverviewStatusRowDto[];
  quickActions: Array<{
    id: string;
    icon: string;
    title: string;
    isDestructive: boolean;
  }>;
  executionScore: number;
  executionScoreLabel: string;
  scoreBreakdown: Array<{ id: string; label: string; value: string; style: string }>;
  aiInsight: {
    observation: string;
    impact: string;
    recommendation: string;
    executable: string;
  };
  meta?: { partial: boolean; skippedSections?: string[] };
}

export interface MobileContextSnapshotDto {
  lifecycle: 'planning' | 'traveling' | 'completed' | 'cancelled';
  contextVersion: number;
  planVersion?: number;
  execution: {
    currentActivityID: string | null;
    nextActivityID: string | null;
    progressPercent: number;
  } | null;
}

export type MobileTodayItineraryItemStatus =
  | 'completed'
  | 'inProgress'
  | 'upcoming'
  | 'delayed'
  | 'risk'
  | 'cancelled';

export interface MobileTodayItineraryItemDto {
  id: string;
  time: string;
  endTime?: string;
  startTime?: string;
  title: string;
  status: MobileTodayItineraryItemStatus;
  metadata?: {
    rfc001ExecutionActivityContext?: {
      byActivityId?: Record<string, { plannedDepartAt?: string }>;
    };
  };
}

export interface MobileTodayItineraryDto {
  tripId: string;
  dayIndex?: number;
  dayLabel?: string;
  items: MobileTodayItineraryItemDto[];
}

export interface DepartureSlipRequest {
  activityId: string;
  observedAt: string;
  stillAtPoi: boolean;
  source: 'USER_REPORT';
}

export type DepartureSlipResponse =
  | { observationId: string; status: 'NO_ACTION' }
  | { observationId: string; status: 'RECORDED'; problemId: string; runId?: string };

export interface ConsumerDecisionRepairOptionDto {
  optionId: string;
  title: string;
  summary?: string;
  preserves: string[];
  sacrifices: string[];
  canApply: boolean;
  changePreview?: { remove?: unknown[]; add?: unknown[]; shortenMinutes?: number };
  scheduleContext?: {
    projectedEtaLabel?: string;
    nextLastEntryAtLabel?: string;
    slipMinutes?: number;
  };
}

export interface ConsumerDecisionScheduleContextDto {
  projectedEtaLabel?: string;
  nextLastEntryAtLabel?: string;
  slipMinutes?: number;
}

export interface ConsumerDecisionItem {
  schemaId?: 'tripnara.consumer_decision_item@v1';
  problemId: string;
  headline: string;
  impact: string;
  explanation?: string;
  severity: 'BLOCK' | 'CONFLICT' | 'VERIFY' | 'OPTIMIZE';
  affectedActivities?: Array<{ activityId: string; title: string; dayIndex?: number }>;
  recommendation?: {
    title: string;
    summary?: string;
    keeps: string[];
    costs: string[];
    recommendedActionId?: string;
  };
  repairOptions?: ConsumerDecisionRepairOptionDto[];
  actions: {
    acceptRecommended: { enabled: boolean; actionId?: string };
    keepOriginal?: { enabled: boolean; actionId?: string };
    viewAlternatives?: { enabled: boolean; count?: number };
    defer?: { enabled: boolean; actionId?: string };
  };
  requiredAcknowledgements?: string[];
  scheduleContext?: ConsumerDecisionScheduleContextDto;
}

export interface AcceptRecommendedRequestBody {
  actionId?: string;
  acknowledgement?: string[];
}
