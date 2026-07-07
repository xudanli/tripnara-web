/**
 * Travel Status BFF — 前端类型
 * @see GET /api/trips/:tripId/travel-status
 */

import type { AutomationAuthorizationCatalog } from './automation-authorization.types';

// ── Executability ────────────────────────────────────────────────────────────

export type ExecutabilityStatus = 'READY' | 'NEEDS_ATTENTION' | 'BLOCKED';

export interface TravelStatusExecutability {
  status: ExecutabilityStatus;
  headline: string;
  subheadline?: string;
  issueCount?: number;
}

// ── AI Completed Work ────────────────────────────────────────────────────────

export type AiCompletedWorkKind =
  | 'AUTO_REPAIR'
  | 'DECISION_APPLIED'
  | 'DECISION_SUBMITTED';

export interface AiCompletedWorkUndo {
  enabled: boolean;
  logId?: string;
  undoActionId?: string;
}

export interface AiCompletedWorkItem {
  activityId: string;
  occurredAt: string;
  summary: string;
  changeSummary?: string;
  kind: AiCompletedWorkKind;
  problemId?: string;
  automatic: boolean;
  reversible: boolean;
  undo?: AiCompletedWorkUndo;
  status?: string;
}

export interface TravelStatusAiCompletedWork {
  items: AiCompletedWorkItem[];
  recentCount?: number;
}

// ── Decision Queue ───────────────────────────────────────────────────────────

export type DecisionQueueSeverity = 'BLOCK' | 'CONFLICT' | 'VERIFY' | 'OPTIMIZE';

export interface DecisionQueueRecommendation {
  title: string;
  summary: string;
  keeps: string[];
  costs: string[];
}

export interface DecisionQueueActionState {
  enabled: boolean;
  actionId?: string;
}

export interface DecisionQueueItemActions {
  acceptRecommended: DecisionQueueActionState;
  keepOriginal?: DecisionQueueActionState;
  viewAlternatives?: DecisionQueueActionState;
  defer?: DecisionQueueActionState;
}

export interface DecisionQueueItem {
  problemId: string;
  headline: string;
  impact: string;
  recommendation: DecisionQueueRecommendation;
  actions: DecisionQueueItemActions;
  severity: DecisionQueueSeverity;
  affectedDayNumbers?: number[];
}

export interface DecisionQueueResponse {
  headline?: string;
  items: DecisionQueueItem[];
}

// ── Monitoring ───────────────────────────────────────────────────────────────

export type MonitoringKind =
  | 'ROAD_CLOSURE'
  | 'WEATHER_HAZARD'
  | 'FLIGHT_STATUS'
  | 'POI_CLOSURE'
  | 'BOOKING_STATUS';

export type MonitoringItemStatus = 'ACTIVE' | 'PENDING' | 'PAUSED' | 'ALERT';

export interface MonitoringItem {
  kind: MonitoringKind;
  label: string;
  status: MonitoringItemStatus;
  lastCheckedAt?: string;
  nextCheckAt?: string;
  summary?: string;
}

export interface TravelStatusMonitoring {
  activeCount: number;
  items: MonitoringItem[];
}

// ── Effective Plan ───────────────────────────────────────────────────────────

export interface TravelStatusEffectivePlan {
  versionId?: string;
  headline?: string;
  summary?: string;
  dayCount?: number;
  itemCount?: number;
  lastUpdatedAt?: string;
  planStudioHref?: string;
}

// ── Automation ───────────────────────────────────────────────────────────────

export type AutomationDefaultLevel =
  | 'INFORM_ONLY'
  | 'SUGGEST'
  | 'AUTO_REPAIR_LOW_RISK'
  | 'AUTO_EXECUTE_CONDITIONAL';

/** BFF automation.uiLevel（四档 UI） */
export type AutomationUiLevel = 'L0_L1' | 'L2' | 'L3' | 'L4';

export interface AutomationTierCounts {
  auto: number;
  ask: number;
  deny: number;
}

export interface TravelStatusAutomation {
  defaultLevel: AutomationDefaultLevel;
  /** @deprecated 使用 uiLevelLabel */
  defaultLevelLabel: string;
  uiLevel: AutomationUiLevel;
  uiLevelLabel: string;
  tierCounts: AutomationTierCounts;
  paused: boolean;
  scope?: 'TRIP' | 'USER_TEMPLATE';
  /** C 端权限 SSOT */
  catalog: AutomationAuthorizationCatalog;
}

// ── Context Snapshot (light ref) ─────────────────────────────────────────────

export interface ContextSnapshotRef {
  snapshotId?: string;
  revision?: number;
  detailHref?: string;
}

// ── Pending Verification ─────────────────────────────────────────────────────

export interface PendingVerificationItem {
  id: string;
  label: string;
  summary?: string;
}

export interface TravelStatusPendingVerification {
  items: PendingVerificationItem[];
}

// ── Main Travel Status ───────────────────────────────────────────────────────

export interface TravelStatusResponse {
  executability: TravelStatusExecutability;
  aiCompletedWork: TravelStatusAiCompletedWork;
  openDecisions: DecisionQueueItem[];
  monitoring: TravelStatusMonitoring;
  effectivePlan: TravelStatusEffectivePlan;
  automation: TravelStatusAutomation;
  pendingVerification?: TravelStatusPendingVerification;
  contextSnapshot: ContextSnapshotRef;
}

// ── Accept Recommended ─────────────────────────────────────────────────────────

export interface AcceptRecommendedResponse {
  submit?: unknown;
  apply?: unknown;
}

// ── Trip Context Snapshot (full) ───────────────────────────────────────────────

export interface TripContextSnapshotContract {
  automation?: {
    defaultLevel?: AutomationDefaultLevel;
  };
  teamGovernance?: {
    rules?: Array<{
      topic?: string;
      rule?: string;
      thresholdPct?: number;
      label?: string;
      description?: string;
      key?: string;
    }>;
  };
}

export interface TripContextSnapshot {
  snapshotId?: string;
  revision?: number;
  goal?: Record<string, unknown>;
  contract?: TripContextSnapshotContract;
  members?: {
    count?: number;
    travelers?: Array<{
      id?: string;
      name?: string;
      displayName?: string;
      avatarUrl?: string;
      role?: string;
    }>;
  };
  openDecisions?: DecisionQueueItem[];
  uncertainties?: Array<{ label?: string; summary?: string }>;
  effectivePlan?: TravelStatusEffectivePlan;
  decisionHistory?: unknown[];
}

// ── NL Intent ─────────────────────────────────────────────────────────────────

export type TripIntentClassificationKind =
  | 'WEATHER_RISK'
  | 'DECISION_STATUS'
  | 'MODIFY_ITINERARY'
  | string;

export type TripIntentSuggestedAction =
  | 'OPEN_DECISION_QUEUE'
  | 'CALL_ROUTE_AND_RUN'
  | 'REVIEW_DISPATCH_RESULT'
  | 'NONE';

export interface TripIntentPostBody {
  message: string;
  problemId?: string;
  dayIndex?: number;
}

export interface TripIntentRouteResult {
  classification: {
    kind: TripIntentClassificationKind;
    label?: string;
  };
  suggestedAction: TripIntentSuggestedAction;
  decisionQueueHeadline?: string;
  dispatch?: unknown;
  contextSnapshot?: ContextSnapshotRef;
}

// ── Monitoring scan ───────────────────────────────────────────────────────────

export interface MonitoringScanResponse {
  scanned?: boolean;
  problemIds?: string[];
}
