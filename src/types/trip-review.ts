import type { BaseEntity } from './common';

// ==================== 基础类型 ====================

export type ReviewStatus = 'draft' | 'generated' | 'user_confirmed' | 'archived';

export type ExecutionEventType =
  | 'CHECKIN'
  | 'CHECKOUT'
  | 'PLAN_ITEM_COMPLETED'
  | 'PLAN_ITEM_SKIPPED'
  | 'PLAN_ITEM_REPLACED'
  | 'DELAY'
  | 'RISK_SIGNAL'
  | 'BOOKING_FAIL'
  | 'REPAIR_ACTION';

export type InsightCategory = 'highlight' | 'friction' | 'decision' | 'rhythm' | 'cost' | 'safety';

export type InsightVote = 'agree' | 'disagree' | 'edit';

export type AnchorType = 'preference' | 'risk_policy' | 'route_pattern' | 'pacing';

export type AnchorScope = 'global' | 'country' | 'trip_type';

export type AnchorStatus = 'saved' | 'suggested' | 'disabled';

export type ReasonTag = 'weather' | 'road' | 'crowd' | 'fatigue' | 'preference' | 'cost' | 'time';

export type DataSource = 'gps' | 'checkin' | 'calendar' | 'manual';

// ==================== 证据事件流 ====================

/**
 * ExecutionEvent（证据事件流）
 * 每条事件尽量结构化，后面洞察都靠它
 */
export interface ExecutionEvent extends BaseEntity {
  eventId: string;
  tripId: string;
  dayIndex: number;
  timestampStart: string;
  timestampEnd?: string | null;
  type: ExecutionEventType;
  refPlanItemId?: string | null;
  placeId?: number | null;
  routeSegmentId?: string | null;
  reasonTags: ReasonTag[];
  impact: EventImpact;
  evidence?: EventEvidence | null;
}

export interface EventImpact {
  timeDeltaMin?: number | null; // +/- 分钟
  distanceDeltaKm?: number | null; // +/- 公里
  costDelta?: number | null; // +/- 成本
  riskDelta?: number | null; // -2 ~ +2
}

export interface EventEvidence {
  weatherSnapshot?: any | null;
  roadCondition?: string | null;
  userNote?: string | null;
  photos?: string[] | null;
  [key: string]: any;
}

// ==================== 复盘主体 ====================

/**
 * TripReview（复盘主体）
 */
export interface TripReview extends BaseEntity {
  reviewId: string;
  tripId: string;
  status: ReviewStatus;
  generatedAt?: string | null;
  confirmedAt?: string | null;
  planVersionId: string; // 复盘基于的计划版本（必须）
  executionVersionId?: string | null; // 实际执行版本（强烈建议有）
  timezone: string;
  locale: string;
  sources: DataSource[];
}

// ==================== 系统洞察 ====================

/**
 * ReviewInsight（系统洞察）
 */
export interface ReviewInsight extends BaseEntity {
  insightId: string;
  reviewId: string;
  category: InsightCategory;
  title: string;
  summary: string; // 1 句话
  confidence: number; // 0-1
  evidenceEventIds: string[]; // 可追溯
  userFeedback?: InsightFeedback | null;
  persona?: 'abu' | 'dre' | 'neptune' | null; // 三人格视角（可选）
  metrics?: Record<string, number> | null; // 关键数字（可选，如分钟/公里/次数）
}

export interface InsightFeedback {
  vote?: InsightVote | null;
  note?: string | null;
}

// ==================== 锚点规则 ====================

/**
 * AnchorRule（锚点规则，可保存到 Profile）
 */
export interface AnchorRule extends BaseEntity {
  anchorId: string;
  userId?: string | null;
  type: AnchorType;
  ruleText: string; // 一句话规则（可编辑）
  parameters: AnchorParameters; // 结构化字段，给规划引擎用
  evidenceTripIds: string[];
  strength: number; // 用户确认强度（1-5）
  scope: AnchorScope;
  status: AnchorStatus;
}

export interface AnchorParameters {
  maxDailyDriveMin?: number;
  preferGoldenHour?: boolean;
  avoidCrowdLevel?: number;
  [key: string]: any;
}

// ==================== KPI 指标 ====================

/**
 * ReviewSummary（复盘页顶部 Summary）
 * 只保留 5~7 个最有"复盘价值"的指标，且必须可解释
 */
export interface ReviewSummary {
  completion: CompletionMetrics;
  changeRate: ChangeRateMetrics;
  scheduleHealth: ScheduleHealthMetrics;
  riskExposure: RiskExposureMetrics;
  budgetDeviation?: BudgetDeviationMetrics | null;
}

export interface CompletionMetrics {
  completedPlanItems: number;
  totalPlanItems: number;
  completionRate: number; // 0-1
  replacedCompleted: number; // 替换算"完成"，但记为 replacedCompleted
}

export interface ChangeRateMetrics {
  replacedCount: number;
  skippedCount: number;
  rescheduledCount: number;
  totalPlanItems: number;
  changeRate: number; // 0-1，用于判断：这次计划是否过度理想化
}

export interface ScheduleHealthMetrics {
  totalDelayMinutes: number; // Σ DELAY.timeDeltaMin
  usedBufferMin?: number | null;
  plannedBufferMin?: number | null;
  bufferUtilizationRate?: number | null; // usedBufferMin / plannedBufferMin
}

export interface RiskExposureMetrics {
  riskEventCount: number; // RISK_SIGNAL count
  totalRiskImpact: number; // Σ impact.riskDelta（-2~+2 的简单标度）
}

export interface BudgetDeviationMetrics {
  actualCost?: number | null;
  plannedCost?: number | null;
  deviation?: number | null; // actualCost - plannedCost
}

// ==================== 完整复盘数据 ====================

/**
 * TripReviewDetail（完整复盘数据，用于页面展示）
 */
export interface TripReviewDetail extends TripReview {
  summary: ReviewSummary;
  events: ExecutionEvent[];
  insights: ReviewInsight[];
  anchorsSuggested: AnchorRule[];
}

// ==================== 三人格洞察 ====================

/**
 * PersonaInsight（三人格视角的洞察）
 */
export interface PersonaInsight extends ReviewInsight {
  persona: 'abu' | 'dre' | 'neptune';
  personaSpecificData?: PersonaSpecificData;
}

export interface PersonaSpecificData {
  // Abu（安全门控 / 风险视角）
  riskLevel?: 'low' | 'medium' | 'high';
  safetyHighlights?: string[];
  safetyFrictions?: string[];
  policySuggestions?: string[];
  
  // Dr.Dre（理性调度 / 约束优化视角）
  rhythmProfile?: {
    wakeUpTime?: string;
    peakFatigueSegment?: string;
    averageDailyMovingHours?: number;
  };
  bottlenecks?: string[];
  optimizationAdvice?: string[];
  
  // Neptune（修复系统 / 最小改动视角）
  repairBefore?: {
    planItemId?: string;
    description?: string;
  };
  repairAfter?: {
    planItemId?: string;
    description?: string;
  };
  repairCost?: {
    timeDeltaMin?: number;
    distanceDeltaKm?: number;
    riskDelta?: number;
  };
  repairPattern?: string;
}

