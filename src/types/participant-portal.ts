/**
 * Participant Portal API types
 * @see docs/api/participant-portal-frontend-integration.md
 */

import type { Gate1Cohort, Gate1ExperimentStatus } from '@/types/gate1';
import type { Gate1TrustSurfacePreview } from '@/types/decision-os';

export type { Gate1TrustSurface, Gate1TrustCard, Gate1TrustSurfacePreview } from '@/types/decision-os';
/** @deprecated 使用 Gate1TrustSurface */
export type { ParticipantTrustSurface } from '@/types/decision-os';

// ── Enums ────────────────────────────────────────────────────────────────────

export type ParticipantStatus =
  | 'INVITED'
  | 'OPENED'
  | 'JOINED'
  | 'CONSENTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'DELETED';

export type ParticipantRole = 'PARTICIPANT' | 'ORGANIZER' | 'DECISION_MAKER' | 'PAYER' | 'GUARDIAN';

export type ConsentCatalogType =
  | 'BASE_SERVICE'
  | 'HUMAN_ASSISTED'
  | 'RESEARCH'
  | 'ANONYMIZED_CASE';

export type ConsentAction = 'ACCEPT' | 'DECLINE';

export type PrivateConstraintAuthorizationLevel = 'ANALYST_ONLY' | 'SANITIZED_TO_ADVISOR';

export type TodoPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type TodoStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'COMPLETED'
  | 'WAIVED';

export type ProposalFeedbackResponse =
  | 'ACCEPT'
  | 'CONCERN'
  | 'REJECT'
  | 'NEED_INFO'
  | 'PRIVATE_CONTACT';

export type ProposalFeedbackStatus = 'SUBMITTED' | 'INVALIDATED';

export type ChangeNoticeSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type ReadinessTaskCategory =
  | 'DOCUMENTS'
  | 'BOOKINGS'
  | 'HEALTH'
  | 'GEAR'
  | 'TRANSPORT'
  | 'PERSONAL'
  | string;

export type AcceptInviteMismatchReason = 'ACCOUNT_MISMATCH' | 'CONTACT_MISMATCH';

// ── Invite landing ───────────────────────────────────────────────────────────

export interface ParticipantConsentCatalogItem {
  type: ConsentCatalogType;
  required: boolean;
  label: string;
  description?: string;
  text?: string;
}

export interface ParticipantConsentCatalog {
  version: string;
  items: ParticipantConsentCatalogItem[];
}

export interface ParticipantInviteProject {
  id: string;
  title: string;
  destination: string;
  cohort: Gate1Cohort;
  summary?: string;
  dateRange?: { start?: string; end?: string };
  participantCount?: number;
}

export interface ParticipantInviteLanding {
  expired?: boolean;
  canRequestResend?: boolean;
  project: ParticipantInviteProject;
  participant: {
    id: string;
    displayName: string;
    status: ParticipantStatus;
  };
  participationGuide?: {
    estimatedMinutes?: string;
    steps?: string[];
  };
  privacySummary?: Record<string, unknown>;
  consentCatalog?: ParticipantConsentCatalog;
  /** @deprecated legacy Gate1 single consent block */
  consent?: { version: string; text: string };
}

// ── Accept invite ────────────────────────────────────────────────────────────

export interface AcceptParticipantInviteRequest {
  userId?: string;
  contactEmail?: string;
  confirmMismatch?: boolean;
}

export interface AcceptParticipantInviteResponse {
  status: ParticipantStatus;
  participantId: string;
  needsConfirmation: boolean;
  reason?: AcceptInviteMismatchReason;
  message?: string;
}

// ── Consent ──────────────────────────────────────────────────────────────────

export type ParticipantConsentsMap = Partial<Record<ConsentCatalogType, boolean>>;

export interface SubmitParticipantConsentRequest {
  inviteToken: string;
  action: ConsentAction;
  declineReason?: string;
  humanAssisted?: boolean;
  research?: boolean;
  anonymizedCase?: boolean;
  consents?: ParticipantConsentsMap;
}

export interface SubmitParticipantConsentResponse {
  status: ParticipantStatus;
  humanAssistedGranted?: boolean;
  canSubmitPreferences: boolean;
  canSubmitPrivateConstraints: boolean;
}

// ── My projects (logged in) ──────────────────────────────────────────────────

export interface ParticipantMyProjectEntry {
  participantId: string;
  inviteToken: string;
  displayName: string;
  status: ParticipantStatus;
  role: ParticipantRole;
  project: {
    id: string;
    title: string;
    destination: string;
    experimentStatus: Gate1ExperimentStatus;
    cohort: Gate1Cohort;
    startDate?: string;
    endDate?: string;
  };
  portalPath: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface ParticipantTodoItem {
  id: string;
  title: string;
  reason?: string;
  priority: TodoPriority;
  status: TodoStatus;
  dueAt?: string;
  impact?: string;
  actionPath?: string;
}

export interface ParticipantDashboardProgress {
  consentComplete: boolean;
  preferencesComplete: boolean;
  proposalFeedbackComplete: boolean;
  readinessComplete: boolean;
  openReadinessTasks: number;
  completionRate: number;
}

export interface ParticipantProposalSummary {
  candidateId: string;
  label: string;
  version: number;
  strategySummary?: string;
  publishedAt?: string;
}

export interface ParticipantChangeSummary {
  id: string;
  title?: string;
  severity?: ChangeNoticeSeverity;
  whatHappened?: string;
  impactSummary?: string;
  actionRequired?: string;
  deadline?: string;
  acknowledged?: boolean;
}

export interface ParticipantReadinessTaskSummary {
  id: string;
  category: ReadinessTaskCategory;
  title: string;
  status: string;
  blocking?: boolean;
  mandatory?: boolean;
  dueAt?: string;
}

export interface ParticipantDashboard {
  project: {
    id: string;
    title: string;
    destination: string;
    stage?: string;
    startDate?: string;
    endDate?: string;
    cohort: Gate1Cohort;
  };
  participant: {
    id: string;
    displayName: string;
    status: ParticipantStatus;
    role: ParticipantRole;
  };
  primaryAction?: ParticipantTodoItem;
  progress: ParticipantDashboardProgress;
  todos: ParticipantTodoItem[];
  proposalSummary?: ParticipantProposalSummary | null;
  recentChanges?: ParticipantChangeSummary[];
  readinessTasks?: ParticipantReadinessTaskSummary[];
  consentStatus?: Array<{ type: ConsentCatalogType; granted: boolean }>;
  /** Sprint 6 · 脱敏信任面入口（与顾问 overview.trustSurface 同形） */
  trustSurface?: Gate1TrustSurfacePreview;
}

// ── Preferences ──────────────────────────────────────────────────────────────

export interface ParticipantPrivateConstraintInput {
  fieldKey: string;
  value: string;
  authorizationLevel?: PrivateConstraintAuthorizationLevel;
  requestHumanContact?: boolean;
}

export interface ParticipantPreferencesRequest {
  publicPrefs: Record<string, unknown>;
  privateConstraints?: ParticipantPrivateConstraintInput[];
  submit?: boolean;
}

export interface ParticipantPrivateConstraintMeta {
  fieldKey: string;
  authorizationLevel?: PrivateConstraintAuthorizationLevel;
  status?: string;
  updatedAt?: string;
}

export interface ParticipantPreferencesResponse {
  publicPrefs: Record<string, unknown>;
  privateConstraintMeta?: ParticipantPrivateConstraintMeta[];
}

// ── Proposal feedback ────────────────────────────────────────────────────────

export interface ParticipantProposalDetail {
  proposal: {
    id: string;
    label: string;
    version: number;
    strategySummary?: string;
    tradeoffs?: string[];
    risks?: string[];
    budgetSummary?: string;
    constraintSatisfaction?: string;
    publishedAt?: string;
  };
  feedback?: {
    response?: ProposalFeedbackResponse;
    status?: ProposalFeedbackStatus;
    candidateVersion?: number;
    needsReconfirm?: boolean;
  } | null;
}

export interface SubmitProposalFeedbackRequest {
  response: ProposalFeedbackResponse;
  reasonType?: string;
  note?: string;
  privateNote?: string;
}

// ── Readiness ─────────────────────────────────────────────────────────────────

export interface ParticipantReadinessTask {
  id: string;
  category: ReadinessTaskCategory;
  title: string;
  status: string;
  blocking?: boolean;
  mandatory?: boolean;
  dueAt?: string;
  evidence?: Record<string, unknown>;
}

export interface ParticipantReadinessResponse {
  tasks: ParticipantReadinessTask[];
}

export interface PatchReadinessTaskRequest {
  evidence?: Record<string, unknown>;
}

// ── Change notices ───────────────────────────────────────────────────────────

export interface ParticipantChangeNoticePlanB {
  id: string;
  label: string;
  alternativeSummary: string;
  costSummary?: string | null;
}

/** GET /participant/projects/:token/change-notices 列表项 */
export interface ParticipantChangeNotice {
  id: string;
  severity: ChangeNoticeSeverity;
  title: string;
  whatHappened: string;
  impactSummary?: string | null;
  actionRequired?: string | null;
  deadline?: string | null;
  publishedAt: string;
  requiresAck: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  planB?: ParticipantChangeNoticePlanB | null;
}

export interface AckChangeNoticeRequest {
  helpRequested?: boolean;
}

export interface AckChangeNoticeResponse {
  acknowledged: boolean;
  acknowledgedAt: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface ParticipantNotification {
  id: string;
  eventType: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  projectId: string;
}

// ── Outcome feedback ─────────────────────────────────────────────────────────

export interface ParticipantOutcomeFeedbackRequest {
  rating: number;
  wouldRecommend: boolean;
  comment?: string;
}

export interface ParticipantWithdrawResponse {
  status: ParticipantStatus;
  deletionTicket?: string;
}

/** Project Fit 申请 ↔ 成员门户衔接 */
export interface ParticipantPortalLink {
  participantId: string;
  inviteToken: string;
  portalPath: string;
  projectId: string;
  projectTitle: string;
  status: ParticipantStatus | string;
}
