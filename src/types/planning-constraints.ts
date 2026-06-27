/** 规划阶段 ② 固化确定性约束 — 摘要类型（PRD §9） */

export type ConstraintFieldStatus = 'confirmed' | 'need_confirm' | 'misaligned' | 'missing';

/** BFF timeRange.status */
export type ConstraintTimeRangeStatus = 'confirmed' | 'missing';

/** BFF budget.status */
export type ConstraintBudgetStatus = 'confirmed' | 'need_confirm' | 'missing';

export type ConstraintPendingKey = 'budget' | 'travelers' | 'transport' | 'time_range';

export interface ConstraintTimeRange {
  startDate: string | null;
  endDate: string | null;
  dayCount: number;
  status: ConstraintFieldStatus;
}

export interface ConstraintBudget {
  total: number | null;
  currency: string;
  gateStatus: 'ALLOW' | 'NEED_CONFIRM' | 'NEED_ADJUST' | 'REJECT' | null;
  status: ConstraintFieldStatus;
}

export interface ConstraintTravelers {
  count: number;
  memberCount: number;
  status: ConstraintFieldStatus;
}

export interface ConstraintTransport {
  travelMode: string | null;
  transportHint: string | null;
  sampleTravelMode: string | null;
  status: ConstraintFieldStatus;
}

export interface ConstraintPendingItem {
  key: ConstraintPendingKey;
  status: Exclude<ConstraintFieldStatus, 'confirmed'>;
  label: string;
  editTab?: string;
  openIntent?: boolean;
  openEditTrip?: boolean;
  openBudgetDialog?: boolean;
  /** BFF pendingItems.deepLink，如 `tab=budget` */
  deepLink?: string;
}

export interface PlanningConstraintsSummary {
  constraintsVersion: number;
  confirmedAt: string | null;
  confirmedBy: string | null;
  isUserConfirmed: boolean;
  /** 曾确认过但 constraintsVersion 已变更，需用户再次确认 */
  needsReconfirm: boolean;
  allReady: boolean;
  pendingCount: number;
  timeRange: ConstraintTimeRange;
  budget: ConstraintBudget;
  travelers: ConstraintTravelers;
  transport: ConstraintTransport;
  pendingItems: ConstraintPendingItem[];
}

export interface TripConstraintsMetadata {
  constraintsVersion?: number;
  constraintsConfirmedAt?: string | null;
  constraintsConfirmedBy?: string | null;
  constraintsConfirmedVersion?: number | null;
}

export interface ConstraintsSummaryPendingItemDto {
  key: ConstraintPendingKey;
  status: Exclude<ConstraintFieldStatus, 'confirmed'> | string;
  label: string;
  deepLink?: string;
}

/** BFF `GET /trips/:id/constraints-summary` */
export interface ConstraintsSummaryResponse {
  tripId: string;
  constraintsVersion: number;
  confirmedAt: string | null;
  confirmedBy: string | null;
  isUserConfirmed: boolean;
  isVersionConfirmed: boolean;
  allReady: boolean;
  pendingCount: number;
  timeRange: {
    startDate: string | null;
    endDate: string | null;
    dayCount: number;
    status: ConstraintTimeRangeStatus;
  };
  budget: {
    total: number | null;
    currency: string | null;
    gateStatus: string | null;
    status: ConstraintBudgetStatus;
  };
  travelers: {
    count: number;
    memberCount: number;
    profilingCompletedCount: number;
    status: ConstraintFieldStatus;
  };
  transport: {
    travelMode: string | null;
    transportHint: string | null;
    sampleTravelMode: string | null;
    sampleDistanceMeters: number | null;
    status: ConstraintFieldStatus;
    /** legacy BFF 嵌套 segment */
    sampleSegment?: {
      duration: number | null;
      distance: number | null;
      travelMode: string | null;
    };
  };
  pendingItems: ConstraintsSummaryPendingItemDto[];
}

export interface ConfirmConstraintsRequest {
  constraintsVersion: number;
}

export interface ConfirmConstraintsResponse {
  constraintsConfirmedAt: string;
  constraintsConfirmedBy: string;
  constraintsVersion: number;
  constraintsConfirmedVersion?: number;
  isUserConfirmed: boolean;
}

export interface TripConstraintsSnapshot {
  constraintsVersion: number;
  constraintsConfirmedAt: string | null;
  constraintsConfirmedBy: string | null;
  constraintsConfirmedVersion?: number | null;
}

export type PlanStudioConstraintsChangeSource =
  | 'budget'
  | 'intent'
  | 'team'
  | 'dates'
  | 'transport'
  | 'collaborators';
