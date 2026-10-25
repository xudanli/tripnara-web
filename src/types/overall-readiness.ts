/**
 * 整体准备度 BFF 契约
 * 对齐后端 GET /trips/:tripId/overall-readiness 与 timeline-overview.overallReadiness
 */

export type OverallReadinessState =
  | 'READY'
  | 'BLOCKED'
  | 'NEEDS_REVALIDATION'
  | 'NEAR_READY'
  | 'IN_PROGRESS'
  | 'NOT_STARTED'
  | (string & {});

export type OverallReadinessDimensionCode =
  | 'ROUTE'
  | 'ACCOMMODATION'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'MEMBER'
  | (string & {});

export type OverallReadinessActionCode =
  | 'CONFIRM_VEHICLE'
  | 'CONFIRM_RENTAL_INSURANCE'
  | 'OPEN_FEASIBILITY_REPORT'
  | 'OPEN_ACCOMMODATION_TAB'
  | 'BOOK_CORE_ACTIVITY'
  | 'OPEN_DECISION_SPACE'
  | 'INVITE_MEMBER_CONFIRM'
  | 'ASSIGN_MEMBER_ROLES'
  | 'COMPLETE_TRAVEL_STYLE'
  | 'COMPLETE_MONEY_DNA'
  | (string & {});

export interface OverallReadinessDimensionSummary {
  code: OverallReadinessDimensionCode;
  labelZh: string;
  score: number;
}

export interface OverallReadinessTopPriority {
  title: string;
  actionCode?: OverallReadinessActionCode;
  estimatedScoreLift?: number;
  deepLink?: string;
}

/** timeline-overview / ?view=card 壳层卡片 */
export interface OverallReadinessCardDto {
  score: number;
  state: OverallReadinessState;
  stateLabelZh: string;
  displayLabelZh: string;
  headline: string;
  evidenceConfidence: number;
  blockerCount: number;
  pendingConfirmationCount: number;
  whyNotReady?: string;
  potentialScoreLift?: number;
  dimensions: OverallReadinessDimensionSummary[];
  topPriority?: OverallReadinessTopPriority;
  reportDeepLink: string;
}

export interface OverallReadinessHomepageAction {
  title: string;
  actionCode?: OverallReadinessActionCode;
  estimatedScoreLift?: number;
  deepLink?: string;
}

export interface OverallReadinessHomepageDimensionRow {
  code: OverallReadinessDimensionCode;
  labelZh: string;
  score: number;
  state?: OverallReadinessState;
  primaryIssue?: string;
}

export interface OverallReadinessHomepage {
  headline: string;
  whyNotReady: string[];
  mustHandleNow: OverallReadinessHomepageAction[];
  canHandleLater: OverallReadinessHomepageAction[];
  potentialScoreLift?: number;
  dimensionRows: OverallReadinessHomepageDimensionRow[];
}

export type OverallReadinessCheckResult =
  | 'VERIFIED_READY'
  | 'READY_UNVERIFIED'
  | 'NOT_READY'
  | 'FAILED'
  | (string & {});

export interface OverallReadinessCheck {
  checkCode: string;
  title: string;
  result: OverallReadinessCheckResult;
  score: number;
  weight?: number;
  severity?: string;
  evidenceRefs?: string[];
  affectedTripObjectRefs?: string[];
}

export interface OverallReadinessDimensionDetail {
  code: OverallReadinessDimensionCode;
  score: number;
  weight?: number;
  state: OverallReadinessState;
  checks: OverallReadinessCheck[];
  evidenceCount?: number;
  blockerCount?: number;
}

export interface OverallReadinessRecommendedAction {
  actionCode?: OverallReadinessActionCode;
  title: string;
  deepLink?: string;
  estimatedScoreLift?: number;
  description?: string;
}

export interface OverallReadinessIssue {
  issueCode: string;
  title: string;
  dimension: OverallReadinessDimensionCode;
  severity?: string;
  impact?: string;
  recommendedAction?: OverallReadinessRecommendedAction;
  affectedTripObjectRefs?: string[];
}

export interface OverallReadinessEvidenceItem {
  id: string;
  dimension?: OverallReadinessDimensionCode;
  evidenceType?: string;
  sourceName?: string;
  statement?: string;
  confidence?: number;
  observedAt?: string;
  expiresAt?: string | null;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface OverallReadinessGlobalGate {
  gateCode: string;
  dimension?: string;
  triggered: boolean;
  title: string;
  reason?: string;
}

export interface OverallReadinessWeights {
  route?: number;
  accommodation?: number;
  transport?: number;
  activity?: number;
  member?: number;
  [key: string]: number | undefined;
}

export interface OverallReadinessPlanningProgressInternal {
  progressPercent?: number;
  completedStages?: number;
  totalStages?: number;
  currentStageName?: string;
}

/** GET /trips/:tripId/overall-readiness 完整报告 */
export interface OverallReadinessReport {
  tripId: string;
  score: number;
  state: OverallReadinessState;
  stateLabelZh: string;
  displayLabelZh: string;
  evidenceConfidence: number;
  expiredEvidenceCount?: number;
  weightTemplateId?: string;
  weights?: OverallReadinessWeights;
  dimensions: Record<string, OverallReadinessDimensionDetail> | OverallReadinessDimensionDetail[];
  homepage: OverallReadinessHomepage;
  blockers: OverallReadinessIssue[];
  pendingConfirmations?: OverallReadinessIssue[];
  evidence: OverallReadinessEvidenceItem[];
  recommendations?: OverallReadinessRecommendedAction[];
  globalGates?: OverallReadinessGlobalGate[];
  planningProgressInternal?: OverallReadinessPlanningProgressInternal;
  calculatedAt?: string;
}

export type OverallReadinessView = 'card' | 'full';
