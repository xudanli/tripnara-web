/** Trip Constraints API — 约束控制台 SSOT（Swagger tag: trip-constraints） */

export type TripConstraintType = 'HARD' | 'SOFT' | 'EXTERNAL';

export type TripConstraintCategory =
  | 'TIME'
  | 'BUDGET'
  | 'MEMBER'
  | 'TRANSPORT'
  | 'PACE'
  | 'PLACE'
  | 'WORLD'
  | 'SAFETY'
  | 'CUSTOM'
  | string;

export type TripConstraintStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'CONFLICTED'
  | 'DISABLED'
  | string;

/** GET /trips/:id/constraints · 卡片强调层级（非 type） */
export type TripConstraintCardTone = 'default' | 'caution' | 'danger' | 'muted';

export interface TripConstraintScope {
  type: 'TRIP' | 'DAY' | 'MEMBER' | 'MEMBER_GROUP' | string;
  dayIndex?: number;
  memberIds?: string[];
}

export interface TripConstraintSource {
  type: 'USER' | 'AI_INFERRED' | 'PRIVATE_WISH' | 'SYSTEM' | 'OFFICIAL_RULE' | string;
  wishId?: string;
  templateId?: string;
}

export interface TripConstraint {
  id: string;
  name: string;
  type: TripConstraintType;
  category?: TripConstraintCategory;
  status?: TripConstraintStatus;
  scope?: TripConstraintScope;
  operator?: string;
  value?: unknown;
  unit?: string;
  priority?: number;
  locked?: boolean;
  allowRelaxation?: boolean;
  enabled?: boolean;
  hasConflict?: boolean;
  /** 卡片边框强调：default 灰框 · caution 待确认 · danger 冲突 · muted 停用 */
  cardTone?: TripConstraintCardTone;
  displayValue?: string;
  /** 官方规则等只读项的说明文案 */
  description?: string;
  source?: TripConstraintSource;
  visibility?: string;
  updatedAt?: string;
  /** c_world_feasibility 等：OUTDATED | CURRENT */
  verificationStatus?: 'CURRENT' | 'OUTDATED' | 'PENDING' | string;
  lastVerifiedAt?: string;
}

export interface TripConstraintsListMeta {
  tripId: string;
  constraintsVersion: number;
  total: number;
  byType?: Partial<Record<TripConstraintType, number>>;
  byStatus?: Partial<Record<TripConstraintStatus, number>>;
  conflictCount?: number;
  pendingConfirmCount?: number;
}

export interface TripConstraintsListResponse {
  meta: TripConstraintsListMeta;
  items: TripConstraint[];
}

export interface TripConstraintsListQuery {
  type?: TripConstraintType;
  category?: TripConstraintCategory;
  status?: TripConstraintStatus;
  conflictOnly?: boolean;
}

export interface CreateTripConstraintDto {
  name: string;
  category: TripConstraintCategory;
  type: TripConstraintType;
  scope?: TripConstraintScope;
  operator?: string;
  value?: unknown;
  unit?: string;
  priority?: number;
  allowRelaxation?: boolean;
  source?: TripConstraintSource;
  visibility?: string;
  constraintsVersion?: number;
}

export interface PatchTripConstraintDto {
  name?: string;
  value?: unknown;
  unit?: string;
  /** 预警阈值（如单段距离 warn km） */
  tolerance?: number;
  priority?: number;
  locked?: boolean;
  allowRelaxation?: boolean;
  enabled?: boolean;
  constraintsVersion?: number;
}

export interface TripConstraintPreviewChange {
  constraintId: string;
  patch: PatchTripConstraintDto;
}

export interface TripConstraintPreviewImpactRequest {
  changes: TripConstraintPreviewChange[];
  planId?: string;
  persist?: boolean;
}

export interface TripConstraintBudgetDeltaRow {
  label: string;
  delta: number;
  currency?: string;
}

export interface TripConstraintPreviewImpactData {
  tripId?: string;
  constraintsVersion?: number;
  refreshType?: 'quick' | 'deep';
  affectedDays?: Array<
    | number
    | { dayNumber: number; tone?: 'major' | 'minor' | 'none'; severity?: string }
  >;
  adjustmentSummary?: string;
  planLabel?: string;
  planNeedsAdjust?: boolean;
  feasibilityBefore?: number | Record<string, unknown>;
  feasibilityAfter?: number | Record<string, unknown>;
  assessBefore?: { overallAverageScore?: number; [key: string]: unknown };
  assessAfter?: { overallAverageScore?: number; [key: string]: unknown };
  executeabilityDelta?: { scoreDelta?: number; mustHandleDelta?: number };
  budgetDelta?: {
    total?: number;
    currency?: string;
    rows?: TripConstraintBudgetDeltaRow[];
  };
  diffBullets?: string[];
  recommendation?: string;
  recommendations?: string[];
  conflictsBefore?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
  conflictsAfter?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
  suggestedFollowUp?: string;
}

export interface CreateTripConstraintResponse {
  constraint: TripConstraint;
  constraints?: {
    constraintsVersion?: number;
    constraintsConfirmedAt?: string | null;
    constraintsConfirmedBy?: string | null;
  };
}

export interface UpdateConstraintsCommandRequest {
  command: 'UPDATE_CONSTRAINTS';
  constraintsVersion?: number;
  changes: TripConstraintPreviewChange[];
  recalculate?: boolean;
}

export interface UpdateConstraintsCommandResponse {
  applied: string[];
  recalcRecommended?: boolean;
  constraintsVersion?: number;
}

export type TripConstraintErrorCode =
  | 'CONSTRAINTS_STALE'
  | 'CONSTRAINT_LOCKED'
  | 'AI_INFERRED_HARD_FORBIDDEN'
  | 'WISH_CONSTRAINT_USE_WISH_API'
  | 'LEGACY_CONSTRAINT_USE_DEDICATED_API';

/** 合成约束稳定 ID（legacy → API） */
export interface TripConstraintsCheckIssue {
  id: string;
  constraintId?: string;
  severity?: 'must_handle' | 'suggest_adjust' | 'pending_confirm' | string;
  message?: string;
  allowRelaxation?: boolean;
}

export interface TripConstraintsCheckResponse {
  constraintsVersion?: number;
  conflictCount?: number;
  mustHandle?: number;
  suggestAdjust?: number;
  pendingConfirm?: number;
  issues?: TripConstraintsCheckIssue[];
  checkedAt?: string;
}

export interface TripConstraintsRepairRequest {
  issueId?: string;
}

export interface TripConstraintsRepairResponse {
  issueId?: string;
  repairOptions?: unknown[];
  message?: string;
}

export const TRIP_CONSTRAINT_LEGACY_IDS = {
  TIME_RANGE: 'c_time_range',
  BUDGET_TOTAL: 'c_budget_total',
  TRAVELERS: 'c_travelers',
  TRANSPORT_MODE: 'c_transport_mode',
  PACING_LEVEL: 'c_pacing_level',
  MUST_PLACES: 'c_must_places',
  AVOID_PLACES: 'c_avoid_places',
  DAILY_WALK_LIMIT: 'c_daily_walk_limit',
  PLANNING_POLICY: 'c_planning_policy',
  LUNCH_STRATEGY: 'c_lunch_strategy',
  WORLD_FEASIBILITY: 'c_world_feasibility',
  MAX_SEGMENT_DISTANCE: 'c_max_segment_distance',
} as const;
