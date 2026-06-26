/**
 * Gate 1 Human-Assisted Concierge · 类型与枚举
 * @see docs/api/gate1-frontend-integration.md
 */

import type { Gate1TrustSurfacePreview } from '@/types/decision-os';

export type { Gate1TrustSurface, Gate1TrustCard, Gate1TrustSurfacePreview } from '@/types/decision-os';

// ── Enums ────────────────────────────────────────────────────────────────────

export type Gate1Cohort = 'PLANNING' | 'NEAR_DEPARTURE' | 'IN_TRIP_RECENT';

export type Gate1ExperimentStatus =
  | 'DRAFT'
  | 'BASELINE_READY'
  | 'COLLECTING'
  | 'ANALYZING'
  | 'ADVISOR_DECIDING'
  | 'READY'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'WITHDRAWN';

export type Gate1ParticipantStatus =
  | 'INVITED'
  | 'OPENED'
  | 'JOINED'
  | 'CONSENTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'DELETED';

export type Gate1OutputVersionStatus = 'DRAFT' | 'PUBLISHED';

export type Gate1SourceType = 'HUMAN_ASSISTED' | 'AUTOMATED' | 'HYBRID';

export type Gate1MightRejectWithoutTripnara = 'YES' | 'NO' | 'UNCERTAIN';

export type Gate1ConflictBaselineStatus = 'ADVISOR_KNOWN' | 'NEWLY_FOUND' | 'PARTIALLY_KNOWN';

export type Gate1ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';

export type Gate1MaterialChangeType =
  | 'ROUTE'
  | 'ACTIVITY'
  | 'ACCOMMODATION'
  | 'TRANSPORT'
  | 'SPLIT'
  | 'BUDGET'
  | 'BUFFER'
  | 'BOOKING'
  | 'PLAN_B';

export type Gate1ReadinessStatus = 'GREEN' | 'YELLOW' | 'RED';

export type Gate1ReadinessAdvisorFeedback = 'USEFUL' | 'KNOWN' | 'ERROR' | 'NOT_APPLICABLE';

export type Gate1ConflictAdvisorFeedback =
  | 'VALUABLE'
  | 'NOT_VALUABLE'
  | 'KNOWN'
  | 'ERROR'
  | 'NEEDS_DISCUSSION';

export type Gate1PlanBAdvisorPreDecision = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type Gate1SecondOrderIntent = 'VERBAL' | 'CONFIRMED' | 'PROVIDED';

export type Gate1PaymentCommitmentType =
  | 'GATE2_DEPOSIT'
  | 'POC_AGREEMENT'
  | 'MARGIN_DEPOSIT'
  | 'OTHER';

export type Gate1TravelEventType = 'INCIDENT' | 'CHANGE' | 'PLAN_B_ACTIVATION' | 'OTHER';

export type Gate1PrivateConstraintAuthorizationLevel = 'ANALYST_ONLY' | 'SANITIZED_TO_ADVISOR';

export type Gate1ConsentAction = 'ACCEPT' | 'DECLINE';

export type Gate1SanitizedConstraintReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Gate1WorkLogTaskType =
  | 'CONFLICT_REPORT'
  | 'CANDIDATE_STRATEGY'
  | 'READINESS'
  | 'PLAN_B'
  | 'PRIVACY_ANALYSIS'
  | 'OTHER';

// ── Shared ───────────────────────────────────────────────────────────────────

export interface Gate1HumanAssistedMeta {
  sourceType: Gate1SourceType;
  humanAssistedLabel?: string;
  version?: number;
  publishedAt?: string;
  humanMinutes?: number;
}

export interface Gate1KnownConflictInput {
  type: string;
  note?: string;
}

// ── Projects ────────────────────────────────────────────────────────────────

export interface CreateGate1ProjectRequest {
  title: string;
  cohort: Gate1Cohort;
  organizationId?: string;
  destination: string;
  participantCount: number;
  linkedTripId?: string;
}

export interface Gate1ProjectSummary {
  id: string;
  title: string;
  cohort: Gate1Cohort;
  experimentStatus: Gate1ExperimentStatus;
  destination?: string;
  participantCount?: number;
  organizationId?: string;
  linkedTripId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Gate1Baseline {
  id?: string;
  version?: number;
  mightRejectWithoutTripnara?: Gate1MightRejectWithoutTripnara;
  rejectReason?: string;
  expectedTotalHours?: number;
  expectedFirstDraftHours?: number;
  revisionRounds?: number;
  difficulty?: number;
  knownConflicts?: Gate1KnownConflictInput[];
  knownRisks?: Gate1KnownConflictInput[];
  pendingConfirmations?: string[];
  originalPlanSummary?: string;
  estimatedGmvCents?: number;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface SubmitGate1BaselineRequest {
  mightRejectWithoutTripnara: Gate1MightRejectWithoutTripnara;
  rejectReason?: string;
  expectedTotalHours?: number;
  expectedFirstDraftHours?: number;
  revisionRounds?: number;
  difficulty?: number;
  knownConflicts?: Gate1KnownConflictInput[];
  knownRisks?: Gate1KnownConflictInput[];
  pendingConfirmations?: string[];
  originalPlanSummary?: string;
  estimatedGmvCents?: number;
  confirm?: boolean;
}

export interface Gate1ParticipantProgress {
  id?: string;
  displayName: string;
  status: Gate1ParticipantStatus;
  submittedAt?: string;
  consentedAt?: string;
}

export interface Gate1ParticipantsProgressResponse {
  participants: Gate1ParticipantProgress[];
  completionRate: number;
}

export interface Gate1ProjectDetail extends Gate1ProjectSummary {
  baseline?: Gate1Baseline | null;
  participantsProgress?: Gate1ParticipantsProgressResponse;
  outcome?: Gate1Outcome | null;
}

// ── Invitations ─────────────────────────────────────────────────────────────

export interface CreateGate1InvitationRequest {
  displayName: string;
  contactHint?: string;
  expiresInDays?: number;
}

export interface Gate1InvitationCreated {
  participant: {
    id: string;
    inviteToken: string;
    status: Gate1ParticipantStatus;
  };
  inviteUrl: string;
}

// ── Participant portal ──────────────────────────────────────────────────────

export interface Gate1InvitationLanding {
  project: {
    id: string;
    title: string;
    destination: string;
    cohort: Gate1Cohort;
  };
  participant: {
    id: string;
    displayName: string;
    status: Gate1ParticipantStatus;
  };
  consent: {
    version: string;
    text: string;
  };
}

export interface Gate1ConsentRequest {
  inviteToken: string;
  action: Gate1ConsentAction;
  declineReason?: string;
}

export interface Gate1ConsentResponse {
  status: Gate1ParticipantStatus;
}

export interface Gate1PrivateConstraintInput {
  fieldKey: string;
  value: string;
  authorizationLevel?: Gate1PrivateConstraintAuthorizationLevel;
}

export interface Gate1PreferencesRequest {
  publicPrefs: Record<string, unknown>;
  privateConstraints?: Gate1PrivateConstraintInput[];
  submit?: boolean;
}

export interface Gate1WithdrawResponse {
  status: Gate1ParticipantStatus;
  deletionTicket: string;
}

export interface Gate1ParticipantFeedbackRequest {
  rating: number;
  wouldRecommend: boolean;
  comment?: string;
}

// ── Advisor read models ───────────────────────────────────────────────────────

export interface Gate1SanitizedConstraint {
  id: string;
  explanation: string;
  impactSummary?: string;
  participantId?: string;
  reviewStatus?: Gate1SanitizedConstraintReviewStatus;
  createdAt?: string;
}

export interface Gate1ConflictFinding extends Gate1HumanAssistedMeta {
  id: string;
  conflictType: string;
  severity: Gate1ConflictSeverity;
  confidence: string;
  source?: string;
  baselineStatus: Gate1ConflictBaselineStatus;
  title: string;
  description: string;
  resolutionDirection?: string;
  isBlocker?: boolean;
  advisorFeedback?: Gate1ConflictAdvisorFeedback;
}

export interface Gate1ConflictReport extends Gate1HumanAssistedMeta {
  version: number;
  status: Gate1OutputVersionStatus;
  findings: Gate1ConflictFinding[];
}

export interface Gate1CandidateStrategy extends Gate1HumanAssistedMeta {
  id: string;
  label: string;
  strategySummary: string;
  constraintSatisfaction?: Record<string, string>;
  tradeoffs?: Record<string, string>;
  risks?: Array<{ type: string; level: string; note?: string }>;
  budgetSummary?: string;
  status: Gate1OutputVersionStatus;
}

export interface Gate1ReadinessFinding extends Gate1HumanAssistedMeta {
  id: string;
  dimension: string;
  status: Gate1ReadinessStatus;
  title: string;
  description: string;
  responsibleParty?: string;
  dueAt?: string;
  isIncremental?: boolean;
  closedAt?: string;
  advisorFeedback?: Gate1ReadinessAdvisorFeedback;
}

export interface Gate1ReadinessReport extends Gate1HumanAssistedMeta {
  version: number;
  status: Gate1OutputVersionStatus;
  findings: Gate1ReadinessFinding[];
}

export interface Gate1PlanB extends Gate1HumanAssistedMeta {
  id: string;
  label: string;
  riskTitle: string;
  triggerCondition: string;
  latestDecisionAt?: string;
  alternativeSummary: string;
  costSummary?: string;
  impactSummary?: string;
  status: Gate1OutputVersionStatus;
  advisorPreDecision?: Gate1PlanBAdvisorPreDecision;
  triggered?: boolean;
  adopted?: boolean;
}

export interface Gate1AdvisorDecision {
  id?: string;
  selectedCandidateId?: string;
  conflictReportVersion?: number;
  adoptedNone?: boolean;
  materialChange: boolean;
  changeTypes?: Gate1MaterialChangeType[];
  changeEvidence?: string;
  modificationSummary?: string;
  reasonText?: string;
  valuableButNotAdopted?: boolean;
  rejectionReason?: string;
  submittedAt?: string;
}

export interface SubmitGate1DecisionRequest {
  selectedCandidateId?: string;
  conflictReportVersion: number;
  adoptedNone?: boolean;
  materialChange: boolean;
  changeTypes?: Gate1MaterialChangeType[];
  changeEvidence?: string;
  modificationSummary?: string;
  reasonText?: string;
  valuableButNotAdopted?: boolean;
  rejectionReason?: string;
}

export interface Gate1ConflictFindingFeedbackRequest {
  feedback: Gate1ConflictAdvisorFeedback;
  note?: string;
}

export interface Gate1ReadinessFindingFeedbackRequest {
  feedback: Gate1ReadinessAdvisorFeedback;
  note?: string;
  closeFinding?: boolean;
}

export interface Gate1PlanBPreDecisionRequest {
  decision: Gate1PlanBAdvisorPreDecision;
  reason?: string;
}

export interface Gate1PlanBOutcomeRequest {
  triggered: boolean;
  adopted: boolean;
  outcomeSummary?: string;
}

// ── Outcome & travel events ───────────────────────────────────────────────────

export interface Gate1TravelEvent {
  id?: string;
  title: string;
  eventType: Gate1TravelEventType;
  occurredAt: string;
  handler?: string;
  result?: string;
  planBId?: string;
  planB?: Pick<Gate1PlanB, 'id' | 'label' | 'riskTitle'>;
}

export interface CreateGate1TravelEventRequest {
  title: string;
  eventType: Gate1TravelEventType;
  occurredAt: string;
  handler?: string;
  result?: string;
  planBId?: string;
}

export interface Gate1Outcome {
  id?: string;
  valueRating?: number;
  valueNotes?: string;
  secondOrderIntent?: Gate1SecondOrderIntent;
  secondOrderProvided?: boolean;
  paymentCommitmentCents?: number;
  paymentCommitmentType?: Gate1PaymentCommitmentType;
  clientRevisionRounds?: number;
  advisorActualHours?: number;
  exceptionCostCents?: number;
  submittedAt?: string;
  completedAt?: string;
}

export interface SubmitGate1OutcomeRequest {
  valueRating?: number;
  valueNotes?: string;
  secondOrderIntent?: Gate1SecondOrderIntent;
  secondOrderProvided?: boolean;
  paymentCommitmentCents?: number;
  paymentCommitmentType?: Gate1PaymentCommitmentType;
  clientRevisionRounds?: number;
  advisorActualHours?: number;
  exceptionCostCents?: number;
  markCompleted?: boolean;
}

export interface Gate1OutcomeBundle {
  outcome: Gate1Outcome | null;
  travelEvents: Gate1TravelEvent[];
  participantFeedbacks: Array<{
    rating: number;
    wouldRecommend: boolean;
    comment?: string;
    participant: { displayName: string };
  }>;
}

// ── Ops ───────────────────────────────────────────────────────────────────────

export interface Gate1OpsQueueItem {
  id: string;
  title: string;
  cohort: Gate1Cohort;
  experimentStatus: Gate1ExperimentStatus;
  completionRate?: number;
  pendingDrafts?: {
    conflicts?: boolean;
    candidates?: boolean;
    readiness?: boolean;
    planB?: boolean;
    sanitization?: boolean;
  };
  slaDueAt?: string;
  assignedTo?: string;
}

export interface AssignGate1PrivacyAnalystRequest {
  analystId: string;
  startsAt: string;
  endsAt: string;
}

export interface ReadGate1PrivateConstraintsRequest {
  reason: string;
}

export interface Gate1PrivateConstraintRecord {
  id: string;
  participantId: string;
  fieldKey: string;
  value: string;
  authorizationLevel: Gate1PrivateConstraintAuthorizationLevel;
}

export interface CreateGate1SanitizedConstraintRequest {
  participantId?: string;
  explanation: string;
  impactSummary?: string;
}

export interface ReviewGate1SanitizedConstraintRequest {
  reviewStatus: Gate1SanitizedConstraintReviewStatus;
}

export interface Gate1ConflictFindingDraft {
  conflictType: string;
  severity: Gate1ConflictSeverity;
  confidence: string;
  source?: string;
  baselineStatus: Gate1ConflictBaselineStatus;
  title: string;
  description: string;
  resolutionDirection?: string;
  isBlocker?: boolean;
}

export interface CreateGate1ConflictReportRequest {
  sourceType: Gate1SourceType;
  humanMinutes: number;
  findings: Gate1ConflictFindingDraft[];
}

export interface PublishGate1OutputRequest {
  humanMinutes: number;
  reviewedBy?: string;
}

export interface CreateGate1CandidateRequest {
  label: string;
  strategySummary: string;
  constraintSatisfaction?: Record<string, string>;
  tradeoffs?: Record<string, string>;
  risks?: Array<{ type: string; level: string; note?: string }>;
  budgetSummary?: string;
  humanMinutes: number;
}

export interface Gate1ReadinessFindingDraft {
  dimension: string;
  status: Gate1ReadinessStatus;
  title: string;
  description: string;
  responsibleParty?: string;
  dueAt?: string;
  isIncremental?: boolean;
}

export interface CreateGate1ReadinessReportRequest {
  humanMinutes: number;
  findings: Gate1ReadinessFindingDraft[];
}

export interface CreateGate1PlanBRequest {
  label: string;
  riskTitle: string;
  triggerCondition: string;
  latestDecisionAt?: string;
  alternativeSummary: string;
  costSummary?: string;
  impactSummary?: string;
  humanMinutes: number;
}

export interface CreateGate1WorkLogRequest {
  taskType: Gate1WorkLogTaskType;
  assigneeId: string;
  artifactRef?: string;
  minutes: number;
  notes?: string;
}

export interface Gate1WorkLog {
  id: string;
  taskType: Gate1WorkLogTaskType;
  assigneeId: string;
  artifactRef?: string;
  minutes: number;
  notes?: string;
  createdAt?: string;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface Gate1MetricThreshold {
  green: number;
  yellow: number;
}

export interface Gate1MetricsResponse {
  cohort: Gate1Cohort | null;
  participation: {
    invitationAcceptRate: number | null;
    preferenceFillRate: number | null;
    privateConstraintUsageRate: number | null;
  };
  value: {
    materialChangeRate: number | null;
    readinessIncrementalRate: number | null;
    planBAdoptionRate: number | null;
  };
  commercial: {
    secondOrderRate: number | null;
    paymentCommitmentProjects: number | null;
    participantFeedbackCount: number | null;
  };
  productization: {
    totalHumanMinutes: number | null;
    completedProjects: number | null;
  };
  thresholds?: Record<string, Gate1MetricThreshold>;
}

export interface Gate1MetricsExportResponse {
  exportedAt: string;
  cohort: Gate1Cohort | null;
  metrics: Gate1MetricsResponse;
  projectSummaries: Array<{
    projectRef: string;
    cohort: Gate1Cohort;
    experimentStatus: Gate1ExperimentStatus;
  }>;
}

// ── Advisor Workspace V0.1 ────────────────────────────────────────────────────
// @see docs/api/advisor-workspace-frontend-integration.md

export type Gate1RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type Gate1NextActionPriority = 'P0' | 'P1' | 'P2';

export type Gate1ProjectListSort = 'needs_action' | 'departure' | 'created';

export type Gate1MissingInfoReason = 'NOT_STARTED' | 'IN_PROGRESS' | 'NEEDS_FOLLOW_UP';

export type Gate1ConflictFindingActionType = 'CONFIRM' | 'DISMISS' | 'RESOLVE';

export type Gate1ReadinessFindingActionType =
  | 'ASSIGN'
  | 'ACCEPT_RISK'
  | 'RESOLVE'
  | 'SELECT_SOLUTION';

export interface Gate1NextAction {
  id: string;
  title: string;
  reason: string;
  priority: Gate1NextActionPriority;
  tab: string;
  path: string;
}

export interface Gate1ProjectListRow {
  id: string;
  title: string;
  destination: string | null;
  cohort: Gate1Cohort;
  experimentStatus: Gate1ExperimentStatus;
  memberCompletionRate: number;
  riskLevel: Gate1RiskLevel;
  daysToDeparture: number | null;
  needsActionScore: number;
  nextAction: Gate1NextAction | null;
  updatedAt: string;
}

export interface Gate1AdvisorDashboardTodo extends Gate1NextAction {
  projectId: string;
  projectTitle: string;
  cohort: Gate1Cohort;
}

export interface Gate1AdvisorDashboard {
  todos: Gate1AdvisorDashboardTodo[];
  highRiskProjects: Gate1ProjectListRow[];
  funnel: Partial<Record<Gate1ExperimentStatus, number>>;
  departingSoon: Gate1ProjectListRow[];
  gate1Summary: {
    totalProjects: number;
    activeProjects: number;
    materialChangeRate: number | null;
    nextOrderRate: number | null;
    totalHumanHours: number;
  };
}

export interface Gate1ProjectOverviewSummary {
  memberCompletionRate: number;
  conflictCount: number;
  blockerConflictCount: number;
  publishedCandidateCount: number;
  redReadinessCount: number;
  hasDecision: boolean;
  planBCount: number;
  riskLevel: Gate1RiskLevel;
}

export interface Gate1ProjectOverview {
  project: {
    id: string;
    title: string;
    destination: string | null;
    cohort: Gate1Cohort;
    experimentStatus: Gate1ExperimentStatus;
    advisorUserId: string;
    participantCount: number | null;
    startDate: string | null;
    endDate: string | null;
    daysToDeparture: number | null;
  };
  summary: Gate1ProjectOverviewSummary;
  nextAction: Gate1NextAction | null;
  recentArtifacts: {
    latestConflictVersion: number | null;
    latestReadinessVersion: number | null;
    latestDecisionAt: string | null;
    /** SUBMITTED = outcome.submittedAt 存在；PENDING = 无 outcome 或未提交 */
    outcomeStatus: Gate1OutcomeStatus;
  };
  /** Sprint 1–5 · 信任面入口摘要 */
  trustSurface?: Gate1TrustSurfacePreview;
}

// ── Decision Runtime · 审计时间线 ─────────────────────────────────────────────

export interface Gate1AuditTimelineActor {
  type: string;
  id: string;
  role?: string;
}

export interface Gate1AuditTimelineEntry {
  eventId: string;
  occurredAt: string;
  eventType: string;
  source: string;
  canonicalEventType: string | null;
  aggregateType: string | null;
  aggregateId: string | null;
  actor: Gate1AuditTimelineActor | null;
  privacyClass: string | null;
  summary: string;
}

export interface Gate1AuditTimeline {
  projectId: string;
  tripId: string | null;
  skippedReason?: string;
  entries: Gate1AuditTimelineEntry[];
}

// ── Decision Runtime · 工作台灰度读 ───────────────────────────────────────────

export type Gate1RuntimeReadModelSource =
  | 'gate1'
  | 'projection_hybrid'
  | 'projection_fallback';

export type Gate1OutcomeStatus = 'SUBMITTED' | 'PENDING';

export interface Gate1RuntimeWorkspaceMeta {
  readModelSource: Gate1RuntimeReadModelSource;
  projectionEnabled: boolean;
  replayValidation: boolean;
  tripId: string | null;
  projectionEventCount: number;
  reconciliationMatched: boolean | null;
  generatedAt: string;
  validationWarnings: string[];
}

export interface Gate1RuntimeWorkspace {
  meta: Gate1RuntimeWorkspaceMeta;
  conflicts: Gate1ConflictReport[];
  candidates: Gate1CandidateStrategy[];
  decisions: Gate1AdvisorDecision[];
  readiness: Gate1ReadinessReport[];
  planBs: Gate1PlanB[];
  outcome: Gate1Outcome | null;
}

// ── Decision Runtime · 运维接口 ─────────────────────────────────────────────

export interface Gate1RuntimeFlags {
  travelEventStoreEnabled: boolean;
  readFromProjection: boolean;
  linkedTripAutoCreate: boolean;
  tripStatusSync: boolean;
  runtimeEventOutbox: boolean;
}

export interface Gate1RuntimeAcceptanceReport {
  [key: string]: unknown;
}

export interface Gate1RuntimeMetrics {
  [key: string]: unknown;
}

export interface Gate1RuntimeReconcileResult {
  [key: string]: unknown;
}

export interface Gate1RuntimeProjectionView {
  [key: string]: unknown;
}

export interface Gate1MissingInfoItem {
  participantId: string;
  displayName: string;
  role: string;
  status: string;
  reason: Gate1MissingInfoReason;
}

export interface Gate1ConstraintsSummary {
  sanitizedConstraints: Gate1SanitizedConstraint[];
  missingInfo: Gate1MissingInfoItem[];
  privateConstraintCount: number;
  sanitizedPendingReview: number;
}

export interface Gate1CandidateCompareDimension {
  key: string;
  a: unknown;
  b: unknown;
  changed: boolean;
}

export interface Gate1CandidateCompareResult {
  candidateA: Pick<
    Gate1CandidateStrategy,
    'id' | 'label' | 'version' | 'strategySummary' | 'budgetSummary'
  >;
  candidateB: Pick<
    Gate1CandidateStrategy,
    'id' | 'label' | 'version' | 'strategySummary' | 'budgetSummary'
  >;
  dimensions: Gate1CandidateCompareDimension[];
}

export interface CreateGate1AdvisorStrategyRequest {
  label: string;
  basedOnCandidateId?: string;
  strategySummary: string;
  constraintSatisfaction?: Record<string, string>;
  tradeoffs?: Record<string, string>;
  risks?: Array<{ type: string; level: string; note?: string }>;
  budgetSummary?: string;
  modificationNote?: string;
}

export interface Gate1ConflictFindingActionRequest {
  action: Gate1ConflictFindingActionType;
  reason?: string;
  resolutionStrategy?: string;
}

export interface Gate1ReadinessFindingActionRequest {
  action: Gate1ReadinessFindingActionType;
  responsibleParty?: string;
  dueAt?: string;
  solutionSummary?: string;
  reason?: string;
}

export interface Gate1ParticipantRemindResult {
  sent: boolean;
  reason?: string;
}

export interface Gate1ProjectWorkLogsResponse {
  logs: Gate1WorkLog[];
  totalMinutes: number;
  byTaskType: Record<string, number>;
}

export interface Gate1OrgPortfolio {
  organizationId: string;
  projectCount: number;
  activeProjectCount: number;
  highRiskCount: number;
  funnel: Record<string, number>;
  projects: Gate1ProjectListRow[];
}

export interface Gate1AdvisorProjectListQuery {
  cohort?: Gate1Cohort;
  experimentStatus?: Gate1ExperimentStatus;
  destination?: string;
  riskLevel?: Gate1RiskLevel;
  sort?: Gate1ProjectListSort;
  departingWithinDays?: number;
}

export interface PatchGate1ProjectStatusRequest {
  status: Gate1ExperimentStatus;
  reason?: string;
}
