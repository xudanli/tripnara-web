/**
 * 行前「可执行性报告」读模型 — Plan Validation 产品层 DTO
 * 底层复用 Constraint Solver / Gate / VERIFY / Readiness，不与行中 DTO 混用。
 */

import type { CoverageDisclosure } from '@/types/coverage-disclosure';

export type FeasibilityVerdictStatus =
  | 'EXECUTABLE'
  | 'ADJUST_REQUIRED'
  | 'NOT_EXECUTABLE'
  | 'STALE'
  | 'UNKNOWN';

export type FeasibilityIssuePriority = 'must_handle' | 'suggest_adjust' | 'pending_confirm';

export type FeasibilityDimensionKey =
  | 'schedule'
  | 'transport'
  | 'booking'
  | 'environment'
  | 'team_fit'
  | 'itinerary_completeness';

export interface FeasibilityProofAtomDto {
  entity?: string;
  constraint?: string;
  currentFact?: string;
  evidenceSource?: string;
  observedAt?: string;
  validUntil?: string;
  ruleId?: string;
  /** trace / 去重用；展示字段勿用（NestJS FeasibilityProofDto.semanticKey） */
  semanticKey?: string;
  confidence?: number;
  evidenceType?: string;
  conclusion?: string;
  /** 关联行程项（POI 证明 / 预订） */
  itemId?: string;
  /** 交通衔接：路段起点 */
  fromItemId?: string;
  /** 交通衔接：路段终点（改时间通常作用于此项） */
  toItemId?: string;
  /** 后端可直接附带；否则前端按 itemId 匹配 repairOptions 合成 */
  planBOptions?: FeasibilityRepairOptionDto[];
}

export interface FeasibilityRepairValidateScopeDto {
  type: 'issue' | 'day' | 'trip' | 'route';
  issueId?: string;
  dayNumber?: number;
  segmentId?: string;
}

export interface FeasibilityRepairOptionPayloadDto {
  itemId?: string;
  field?: 'startTime' | 'endTime';
  /** ISO 时间或挪天等结构化建议 */
  suggestedValue?: string | { dayNumber?: number };
  targetDayNumber?: number;
  strategy?: string;
  segmentId?: string;
  fromItemId?: string;
  toItemId?: string;
  validateScope?: FeasibilityRepairValidateScopeDto;
}

export type FeasibilityRepairActionType =
  | 'adjust_time'
  | 'move_to_day'
  | 'manual_confirm'
  | 'fetch_weather'
  | 'check_road'
  | 'check_hours'
  | 'reorder_pois'
  | 'remove_pois'
  | 'find_alternative_route'
  | 'book_transport'
  | 'change_hotel'
  | 'buy_insurance';

export interface FeasibilityRepairOptionDto {
  id: string;
  label: string;
  description?: string;
  impactSummary?: string;
  actionType?: FeasibilityRepairActionType;
  payload?: FeasibilityRepairOptionPayloadDto;
  metadata?: Record<string, unknown>;
}

export type FeasibilityIssueKind =
  | 'inter_day_travel'
  | 'same_day_travel'
  | 'road_class'
  | 'opening_hours'
  | 'profiling_incomplete'
  | 'team_friction'
  | 'team_fatigue'
  | 'itinerary_structure'
  | 'daily_drive'
  | 'no_night_drive'
  | 'budget'
  | 'generic';

export interface FeasibilityIssueAnchorsDto {
  fromItemId: string;
  toItemId: string;
  fromDayNumber: number;
  toDayNumber: number;
  fromPlaceLabel: string;
  toPlaceLabel: string;
  segmentId?: string;
  /** 后端路段距离（km）；前端归一为 travelDistanceMeters */
  distanceKm?: number;
  travelMode?: string;
  travelMinutes: number;
  travelDistanceMeters?: number;
  departAt?: string;
  arriveAt?: string;
  activityStartAt?: string;
  /** 后端锚点：上一段结束 / 下一段开始（与 departAt / activityStartAt 互补） */
  fromTime?: string;
  toTime?: string;
  suggestedTime?: string;
  gapMinutes?: number;
  shortfallMinutes?: number;
  isStartTooEarly?: boolean;
  timingSource?: 'computed' | 'missing_times' | 'user_confirmed';
}

export interface FeasibilityIssueUiHintsDto {
  primaryAction?:
    | 'open_schedule'
    | 'open_travel_timing_dialog'
    | 'open_repair'
    | 'confirm_only'
    | 'adjust_time';
  deepLink?: {
    tab: 'schedule';
    dayIndex: number;
    highlightItemIds: string[];
  };
}

export type FeasibilityResolutionMode =
  | 'DIRECT_EDIT'
  | 'AUTO_FIX'
  | 'EVIDENCE_REFRESH'
  | 'COLLABORATION'
  | 'DECISION_REQUIRED';

export interface FeasibilityIssueDto {
  id: string;
  /** 冲突点击时 GET /decision-problems/:id；缺省与 id 相同 */
  decisionProblemId?: string;
  linkedDecisionProblemId?: string | null;
  resolutionMode?: FeasibilityResolutionMode;
  escalationReason?: string | null;
  priority: FeasibilityIssuePriority;
  category: FeasibilityDimensionKey | string;
  title: string;
  message: string;
  affectedDays?: number[];
  tripDayId?: string;
  issueKind?: FeasibilityIssueKind;
  /** 来自冲突检测（与 Plan Studio ConflictType 同枚举） */
  conflictType?: string;
  anchors?: FeasibilityIssueAnchorsDto;
  uiHints?: FeasibilityIssueUiHintsDto;
  repairOptions?: FeasibilityRepairOptionDto[];
  proofs?: FeasibilityProofAtomDto[];
  actionRequired?: string;
  severity: 'high' | 'medium' | 'low';
  /** 关联约束 id（OFFICIAL_RULE · c_official_* / c_official_poi_* 与卡片 judgmentRule 同源） */
  relatedConstraintIds?: string[];
}

export interface FeasibilityDayAccommodationDto {
  needsNightStay: boolean;
  hasAccommodation: boolean;
  label?: string;
  itemId?: string;
  message?: string;
}

export interface FeasibilityDayStatusDto {
  dayNumber: number;
  tripDayId?: string;
  status: 'ok' | 'warning' | 'blocked';
  summary?: string;
  issueIds: string[];
  accommodation?: FeasibilityDayAccommodationDto;
}

export interface FeasibilityDimensionTileDto {
  key: FeasibilityDimensionKey | string;
  label: string;
  score: number;
  statusLabel: string;
  issueCount: number;
  blockerCount: number;
}

export interface FeasibilityTeamFitSummaryDto {
  score: number;
  memberCount: number;
  profilingCompletedCount: number;
}

export interface FeasibilityItineraryCompletenessSummaryDto {
  score: number;
  signalCount: number;
}

export interface FeasibilityAlternativeDto {
  id: string;
  name: string;
  score?: number;
  executabilityRate?: number;
  drivingHours?: number;
  isCurrent?: boolean;
  href?: string;
}

export type FeasibilityProbabilisticMethod = 'MONTE_CARLO' | 'HEURISTIC' | 'UNAVAILABLE';

export type FeasibilityPomdpBeliefRefinement = 'POMDP' | 'NONE' | 'META_ALLOCATOR';

export type FeasibilityIndependenceTier = 'INDIRECT_PROXY' | 'DIRECT' | 'NONE';

export interface FeasibilityProbabilisticAssessmentDto {
  method: FeasibilityProbabilisticMethod;
  /** 0–1；辅助洞察，不覆盖 canStartExecute / verdict.status */
  feasibilityProbability?: number;
  expectedUtility?: number;
  /** 含「不覆盖 must_handle」声明 */
  narrative?: string;
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number;
  };
  riskMetrics?: {
    downRiskProbability: number;
    worstCase: number;
    bestCase: number;
    volatility: number;
  };
  dimensionExpectations?: Record<string, number>;
  pomdp?: {
    beliefRefinement: FeasibilityPomdpBeliefRefinement;
    observationProvenance?: string;
    independenceTier?: FeasibilityIndependenceTier;
    worldSource?: 'world.buildContext' | 'dso_stub';
  };
  /** 运营 / 调试字段，C 端可隐藏 */
  audit?: {
    session_consistency_score?: number;
    dominant_cid?: string;
    drift_vector?: {
      delta_utility: number;
      delta_feasibility_proxy: number;
    };
    /** validate 成功时 decision_os_audit 事件切片 */
    decisionOsAudit?: Record<string, unknown>;
  };
  monteCarloDiagnostics?: {
    sampleSize: number;
    durationMs: number;
    convergenceAchieved: boolean;
  };
  keyRiskFactors?: string[];
}

/** POST /trips/:tripId/feasibility-report/validate 可选 body */
export interface FeasibilityReportValidateOptions {
  forceRefreshEvidence?: boolean;
  runMonteCarlo?: boolean;
  monteCarloSampleSize?: number;
}

/** POST .../validate-scope 局部范围 */
export type FeasibilityValidateScope =
  | { type: 'day'; dayNumber: number }
  | { type: 'issue'; issueId: string }
  | { type: 'route'; segmentId: string }
  | { type: 'trip' };

export interface TripFeasibilityReportDto {
  tripId: string;
  tripTitle: string;
  dateRangeLabel: string;

  verdict: {
    status: FeasibilityVerdictStatus;
    headline: string;
    subheadline?: string;
  };

  overallScore: number;

  verifiedAt?: string;
  verifiedForTripVersion?: string;
  currentTripVersion?: string;
  isStale: boolean;

  dimensions: FeasibilityDimensionTileDto[];
  dayTimeline: FeasibilityDayStatusDto[];
  issues: FeasibilityIssueDto[];
  alternatives: FeasibilityAlternativeDto[];

  /** 团队适配维度摘要（不计入 overallScore） */
  teamFitSummary?: FeasibilityTeamFitSummaryDto;
  /** 行程结构完整度摘要（不计入 overallScore） */
  itineraryCompletenessSummary?: FeasibilityItineraryCompletenessSummaryDto;

  summary: {
    mustHandle: number;
    suggestAdjust: number;
    pendingConfirm: number;
    blockers: number;
  };

  /** 已验证 + 未 stale + EXECUTABLE + 无 must_handle */
  canStartExecute?: boolean;
  /**
   * 概率层辅助洞察；不覆盖 canStartExecute、verdict.status 或 must_handle 判定。
   * 后端也可能将 MC 摘要写入 verdict.subheadline。
   */
  probabilisticAssessment?: FeasibilityProbabilisticAssessmentDto;
  phaseHint?: string;
  daysUntilStart?: number;
  coverageDisclosure?: CoverageDisclosure;
}
