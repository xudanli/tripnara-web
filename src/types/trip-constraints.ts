/** Trip Constraints API — 约束控制台 SSOT（Swagger tag: trip-constraints） */

export type { ChangeStrategyArchetype, TripObjectivePrinciple, AutomationDefaultLevel } from '@/types/travel-decision-contract';
import type { SafetyConstraintCheckHint, SafetyConstraintCheckUsage } from '@/types/safety-constraints-check';

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
  /** GET /constraints 分区 key（meta.sections） */
  sectionKey?: TripConstraintsSectionKey | string;
  /** BFF 硬约束合同元数据（§3.4 SSOT，优先于前端静态规则） */
  contractMeta?: TripConstraintContractMeta;
}

export type TripConstraintViolationResult = 'BLOCK' | 'CONFIRM' | string;

/** GET /constraints · items[].contractMeta */
export interface TripConstraintContractMeta {
  enabledSummary?: string;
  scopeLabel?: string;
  judgmentRule?: string;
  violationResult?: TripConstraintViolationResult;
  violationResultLabel?: string;
}

/** GET /constraints · meta.sections 分区 key（7+2） */
export type TripConstraintsSectionKey =
  | 'travel_objectives'
  | 'hard_must_satisfy'
  | 'soft_prefer'
  | 'team_members'
  | 'change_strategy'
  | 'automation'
  | 'conflicts_and_impact'
  | 'readonly_official'
  | 'readonly_world'
  | string;

export type TripConstraintsSectionKind = 'contract' | 'constraints';

/** section.contractBlock — contract 区块渲染器 */
export type TripConstraintsContractBlockType =
  | 'objectives'
  | 'change_strategy'
  | 'automation'
  | 'team_governance'
  | 'conflicts'
  | string;

export interface TripConstraintsSectionMeta {
  key: TripConstraintsSectionKey;
  label: string;
  count?: number;
  subtitle?: string;
  kind?: TripConstraintsSectionKind;
  /** 只读分区（官方规则 / 世界验证） */
  readonly?: boolean;
  /** 非 null 时渲染 contract 区块（可与 constraints 并存，如 team_members） */
  contractBlock?: TripConstraintsContractBlockType | null;
  /** BFF 指定本区 constraint id 列表 */
  constraintIds?: string[];
}

export interface TripConstraintsDisplayPrinciple {
  principle: TripObjectivePrinciple;
  label: string;
  rank?: number;
}

export interface TripConstraintsContractObjectives {
  rankedPrinciples?: TripObjectivePrinciple[];
  /** 排序 UI 首选：含中文 label */
  displayPrinciples?: TripConstraintsDisplayPrinciple[];
}

export interface TripConstraintsCompiledWeights {
  /** 可直接喂现有优化器（comfort / experience / cost 等） */
  legacy?: Record<string, number>;
  principles?: Record<string, number>;
}

export interface TripConstraintsChangeStrategy {
  archetype?: ChangeStrategyArchetype;
  tolerances?: Record<string, unknown>;
}

export interface TripConstraintsAutomationPolicy {
  /** 默认自动化级别 — 影响决策队列数量 */
  defaultLevel?: AutomationDefaultLevel;
  autoAllowed?: string[];
  requireConfirm?: string[];
  confirmationRequired?: string[];
  actionOverrides?: Record<string, string>;
  executionConditions?: Record<string, Record<string, unknown>>;
  levels?: Array<{ key: string; label?: string; description?: string }>;
}

export interface TripConstraintsTeamGovernance {
  members?: Array<{
    id: string;
    name?: string;
    role?: string;
    constraintsSummary?: string;
  }>;
  rules?: Array<{ key?: string; label: string; description?: string }>;
}

export interface TripConstraintsConflictSummaryItem {
  id?: string;
  message: string;
  severity?: string;
  sources?: string[];
  suggestedResolution?: string;
}

export interface TripConstraintsConflictSummary {
  summary?: string;
  feasibilityScore?: number;
  hasConflicts?: boolean;
  mustHandle?: number;
  items?: TripConstraintsConflictSummaryItem[];
}

/** POST /constraints/check · contractConflicts */
export interface TripConstraintsContractConflictSummary {
  hasConflicts?: boolean;
  mustHandle?: number;
  suggestAdjust?: number;
  total?: number;
  conflictConstraintIds?: string[];
  summary?: string;
  items?: TripConstraintsConflictSummaryItem[];
}

export interface TripConstraintsContract {
  objectives?: TripConstraintsContractObjectives;
  compiledWeights?: TripConstraintsCompiledWeights;
  changeStrategy?: TripConstraintsChangeStrategy;
  automation?: TripConstraintsAutomationPolicy;
  teamGovernance?: TripConstraintsTeamGovernance;
  conflicts?: TripConstraintsConflictSummary;
  /** @deprecated 使用 objectives.displayPrinciples */
  displayPrinciples?: TripConstraintsDisplayPrinciple[];
}

export interface PatchTripConstraintsContractDto {
  objectives?: TripConstraintsContractObjectives;
  changeStrategy?: TripConstraintsChangeStrategy;
  automation?: TripConstraintsAutomationPolicy;
  teamGovernance?: Partial<TripConstraintsTeamGovernance>;
  constraintsVersion?: number;
}

export interface PatchTripConstraintsContractResponse {
  contract: TripConstraintsContract;
  constraintsVersion?: number;
}

export interface TripConstraintsListMeta {
  tripId: string;
  constraintsVersion: number;
  total: number;
  byType?: Partial<Record<TripConstraintType, number>>;
  byStatus?: Partial<Record<TripConstraintStatus, number>>;
  conflictCount?: number;
  pendingConfirmCount?: number;
  /** 7+2 分区定义（有序） */
  sections?: TripConstraintsSectionMeta[];
}

export interface TripConstraintsListResponse {
  meta: TripConstraintsListMeta;
  items: TripConstraint[];
  contract?: TripConstraintsContract;
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
  scope?: TripConstraintScope;
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
  constraintsVersion?: number;
  refreshType?: 'quick' | 'deep';
}

export interface TripConstraintBudgetDeltaRow {
  label: string;
  delta: number;
  currency?: string;
}

export interface TripConstraintPreviewConstraintChange {
  constraintId: string;
  name?: string;
  /** API 可能返回 time 对象（如 `{ time: "08:00" }`），adapter 会格式化为 string */
  before?: number | string | Record<string, unknown>;
  after?: number | string | Record<string, unknown>;
  unit?: string;
}

export interface TripConstraintPreviewStructuredImpact {
  summaryBullets?: string[];
  executeability?: {
    scoreBefore?: number;
    scoreAfter?: number;
    scoreDelta?: number;
  };
  schedule?: {
    daysNeedingSplit?: number[];
    extraLodgingNights?: number;
    poisToRelocate?: Array<{ dayNumber?: number; itemId?: string; label?: string }>;
  };
  budget?: {
    deltaPct?: number;
    deltaAmount?: number;
    currency?: string;
  };
  constraintChanges?: TripConstraintPreviewConstraintChange[];
}

export interface TripConstraintPreviewImpactData {
  tripId?: string;
  constraintsVersion?: number;
  refreshType?: 'quick' | 'deep';
  affectedDays?: Array<
    | number
    | { dayNumber: number; tone?: 'major' | 'minor' | 'none'; severity?: string }
  >;
  affectedItemIds?: string[];
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
  /** POST preview-impact · 优先于分散字段 */
  structuredImpact?: TripConstraintPreviewStructuredImpact;
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
  | 'OFFICIAL_RULE_READONLY'
  | 'UNKNOWN_CONSTRAINT_TEMPLATE'
  | 'CONSTRAINT_TEMPLATE_ALREADY_EXISTS'
  | 'LEGACY_CONSTRAINT_USE_PATCH'
  | 'AI_INFERRED_HARD_FORBIDDEN'
  | 'WISH_CONSTRAINT_USE_WISH_API'
  | 'LEGACY_CONSTRAINT_USE_DEDICATED_API';

export type TripConstraintsCheckIssueKind =
  | 'schedule_violation'
  | 'soft_tradeoff'
  | 'hard_block'
  | string;

/** POST /check · 软约束 trade-off 牺牲项（与日程 advisory 合并展示） */
export interface TripConstraintsSoftTradeoff {
  constraintId: string;
  templateId?: string;
  /** API stored priority（求解器 weight = priority / 10） */
  priority?: number;
  solverWeight?: number;
  message?: string;
  sacrificed?: boolean;
}

/** 合成约束稳定 ID（legacy → API） */
export interface TripConstraintsCheckIssue {
  id: string;
  /** 冲突点击时 GET /decision-problems/:id；缺省与 id 相同 */
  decisionProblemId?: string;
  constraintId?: string;
  /** POST /check · feasibility issues[] 同源 id（含 c_official_* / c_official_poi_*） */
  relatedConstraintIds?: string[];
  severity?: 'must_handle' | 'suggest_adjust' | 'pending_confirm' | string;
  issueKind?: TripConstraintsCheckIssueKind;
  /** trade-off 已牺牲 — 不再重复报同约束的日程 suggest_adjust */
  sacrificed?: boolean;
  templateId?: string;
  /** BFF 回传：priority / 10 */
  solverWeight?: number;
  message?: string;
  allowRelaxation?: boolean;
}

export interface TripConstraintsCheckResponse {
  constraintsVersion?: number;
  conflictCount?: number;
  hasConflicts?: boolean;
  mustHandle?: number;
  suggestAdjust?: number;
  pendingConfirm?: number;
  summary?: { mustHandle?: number; suggestAdjust?: number; total?: number };
  contractConflicts?: TripConstraintsContractConflictSummary;
  issues?: TripConstraintsCheckIssue[];
  /** trade-off 牺牲明细（与 issues 合并后由前端 normalize） */
  softTradeoffs?: TripConstraintsSoftTradeoff[];
  /** 被牺牲的约束 id（API c_*）；对应日程 violation 应被 suppress */
  sacrificedConstraintIds?: string[];
  checkedAt?: string;
  /** narrate-only：`ConstraintEvaluationGateway` 叙述投影，非正式门禁 */
  usage?: SafetyConstraintCheckUsage;
  formal_authority?: string;
  formalAuthority?: string;
  /** narrate_only 下勿用于 disable submit / apply */
  is_blocked?: boolean;
  isBlocked?: boolean;
  requires_approval?: boolean;
  requiresApproval?: boolean;
  violations?: SafetyConstraintCheckHint[];
  warnings?: SafetyConstraintCheckHint[];
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
  MAX_DAILY_DRIVE: 'c_max_daily_drive',
  NO_NIGHT_DRIVE: 'c_no_night_drive',
} as const;
