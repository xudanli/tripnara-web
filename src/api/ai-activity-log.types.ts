export type AiActivityLogFilterTag =
  | 'ALL'
  | 'AUTO'
  | 'WAITING_CONFIRM'
  | 'WRITTEN_BACK'
  | 'CANCELLED';

export type AiActivityLogCategory =
  | 'MONITORING'
  | 'TIME_ROUTE'
  | 'ACTIVITY'
  | 'BUDGET_BOOKING'
  | 'SAFETY'
  | 'TEAM_PRIVACY'
  | 'VALIDATION'
  | 'OTHER'
  | string;

export type AiActivityLogStatusTag =
  | 'AUTO_EXECUTED'
  | 'USER_CONFIRMED'
  | 'WAITING_CONFIRM'
  | 'WRITTEN_BACK'
  | 'CANCELLED'
  | string;

export interface AiActivityLogActionLink {
  enabled?: boolean;
  href?: string;
  actionId?: string;
}

export interface AiActivityLogItemActions {
  viewEvidence?: AiActivityLogActionLink;
  viewDiff?: AiActivityLogActionLink;
  viewPlan?: AiActivityLogActionLink;
}

export interface AiActivityLogTimelineItem {
  activityId: string;
  eventId?: string;
  occurredAt: string;
  category: AiActivityLogCategory;
  categoryLabel?: string;
  filterTags: AiActivityLogFilterTag[];
  statusTag: AiActivityLogStatusTag;
  statusLabel: string;
  title: string;
  reason?: string;
  problemId?: string;
  automatic?: boolean;
  reversible?: boolean;
  actions?: AiActivityLogItemActions;
  detailHref?: string;
}

export interface AiActivityLogLatestRevalidation {
  activityId: string;
  occurredAt?: string;
  title?: string;
  feasibilityScoreBefore?: number;
  feasibilityScoreAfter?: number;
}

export interface AiActivityLogSummary {
  todayActionCount: number;
  todayActionDelta?: number;
  autoCompletedCount: number;
  autoCompletedPct?: number;
  waitingConfirmCount: number;
  waitingConfirmPct?: number;
  latestRevalidation?: AiActivityLogLatestRevalidation | null;
}

export interface AiActivityLogListResponse {
  schemaId?: string;
  tripId: string;
  generatedAt?: string;
  summary: AiActivityLogSummary;
  filters?: AiActivityLogFilterTag[];
  items: AiActivityLogTimelineItem[];
}

export interface AiActivityLogEvidenceItem {
  label: string;
  detail?: string;
  updatedAt?: string;
}

export interface AiActivityLogImpactMetricPair<T = string | number> {
  before?: T;
  after?: T;
}

export interface AiActivityLogImpactMetrics {
  feasibilityScore?: AiActivityLogImpactMetricPair<number>;
  riskLevel?: AiActivityLogImpactMetricPair<string>;
}

export interface AiActivityLogConfirmedBy {
  userId?: string;
  displayName?: string;
  occurredAt?: string;
}

export interface AiActivityLogUndoAction {
  enabled?: boolean;
  logId?: string;
  undoActionId?: string;
}

export interface AiActivityLogDetailResponse {
  schemaId?: string;
  tripId: string;
  activityId: string;
  eventId?: string;
  occurredAt?: string;
  category?: AiActivityLogCategory;
  categoryLabel?: string;
  statusTag?: AiActivityLogStatusTag;
  statusLabel?: string;
  title: string;
  executionReason?: string;
  evidence?: AiActivityLogEvidenceItem[];
  impactMetrics?: AiActivityLogImpactMetrics;
  confirmedBy?: AiActivityLogConfirmedBy | null;
  reversible?: boolean;
  undo?: AiActivityLogUndoAction;
  problemId?: string;
  actions?: AiActivityLogItemActions;
}
