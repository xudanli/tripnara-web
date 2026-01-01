/**
 * 策略模块类型定义
 */

// ==================== 基础类型 ====================

export type DifficultyLevel = 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Persona = 'ABU' | 'DR_DRE' | 'NEPTUNE';
export type Action = 'ALLOW' | 'REJECT' | 'ADJUST' | 'REPLACE';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SuggestionType = 
  | 'SHIFT_EARLIER' 
  | 'SHIFT_LATER' 
  | 'REORDER_AVOID_WAIT' 
  | 'REMOVE_POI' 
  | 'ADD_BUFFER';

// ==================== 世界模型上下文 ====================

export interface DEMEvidenceItem {
  segmentId: string;
  elevationProfile: number[]; // 高程剖面（米）
  cumulativeAscent: number; // 累计爬升（米）
  maxSlopePct: number; // 最大坡度（百分比）
  rollingAscent3Days: number; // 3天滚动爬升（米）
  fatigueIndex: number; // 疲劳指数
  violation: 'HARD' | 'SOFT' | 'NONE';
  explanation: string;
}

export interface RoadState {
  roadId: string;
  status: 'OPEN' | 'CLOSED' | 'SEASONAL';
  seasonOpenFrom?: number; // 月份（1-12）
  seasonOpenTo?: number; // 月份（1-12）
}

export interface HazardZone {
  zoneId: string;
  type: 'AVALANCHE' | 'LANDSLIDE' | 'FLOOD' | 'OTHER';
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  seasonality?: {
    highRiskMonths?: number[]; // 高风险月份（1-12）
  };
}

export interface FerryState {
  ferryId: string;
  routeId: string;
  status: 'RUNNING' | 'CANCELLED' | 'SEASONAL';
  seasonOpenFrom?: number;
  seasonOpenTo?: number;
}

export interface PhysicalRealityModel {
  demEvidence: DEMEvidenceItem[];
  roadStates: RoadState[];
  hazardZones: HazardZone[];
  ferryStates: FerryState[];
  climateSeasonality?: {
    accessibilityScore: number; // 可达性评分（0-1）
  };
  countryCode: string; // ISO 3166-1 alpha-2
  month: number; // 月份（1-12）
}

export interface HumanCapabilityModel {
  maxDailyAscentM: number; // 每日最大爬升（米）
  rollingAscent3DaysM: number; // 3天滚动爬升上限（米）
  maxSlopePct: number; // 最大坡度限制（百分比）
  weatherRiskWeight: number; // 天气风险权重（0-1）
  bufferDayBias: 'LOW' | 'MEDIUM' | 'HIGH'; // 缓冲日偏好
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH'; // 风险承受度
}

export interface ComplianceEvidence {
  requiresPermit: boolean;
  requiresGuide: boolean;
  valid: boolean;
  violation: 'HARD' | 'SOFT' | 'NONE';
}

export interface WorldModelContext {
  // 必须：物理现实模型
  physical: PhysicalRealityModel;
  // 必须：人体能力模型
  human: HumanCapabilityModel;
  // 必须：路线方向（带哲学模型）
  routeDirection: {
    id: string;
    nameCN: string;
    nameEN?: string;
    countryCode: string;
    philosophy?: string | any;
    [key: string]: any;
  };
  // 可选：合规证据
  complianceEvidence?: ComplianceEvidence[];
}

// ==================== 路线计划 ====================

export interface RouteSegment {
  segmentId: string; // 必须：路段 ID
  dayIndex: number; // 必须：日期索引（从0开始）
  distanceKm: number; // 必须：距离（公里）
  ascentM: number; // 必须：爬升（米）
  slopePct: number; // 必须：坡度（百分比）
  metadata?: Record<string, any>; // 可选：元数据
  // 图数据库支持字段（可选）
  graphRelations?: {
    fromPlaceId?: string;
    toPlaceId?: string;
    graphNodeId?: string;
    relationType?: 'CONNECTS_TO' | 'BELONGS_TO' | 'HAS_SEGMENT';
  };
}

export interface RoutePlanDraft {
  tripId: string; // 必须：行程 ID
  routeDirectionId: string; // 必须：路线方向 ID
  segments: RouteSegment[];
}

// ==================== 决策引擎响应 ====================

export interface SafetyViolation {
  persona: Persona;
  action: Action;
  reason: string;
  evidence: {
    type: string;
    segmentId?: string;
    [key: string]: any;
  };
}

export interface AlternativeRoute {
  description: string;
  plan: RoutePlanDraft;
  reason: string;
}

// ==================== 接口 1: 安全规则校验 ====================

export interface ValidateSafetyRequest {
  tripId?: string;
  plan: RoutePlanDraft;
  worldContext: WorldModelContext;
}

export interface ValidateSafetyResponse {
  success: true;
  data: {
    allowed: boolean;
    violations: SafetyViolation[];
    alternativeRoutes?: AlternativeRoute[];
    message: string;
  };
}

// ==================== 接口 2: 行程节奏调整 ====================

export interface AdjustPacingRequest {
  tripId?: string;
  plan: RoutePlanDraft;
  worldContext: WorldModelContext;
}

export interface PacingChange {
  type: 'SPLIT' | 'INSERT_REST' | 'REDUCE_DURATION';
  segmentId: string;
  newSegments?: string[];
  reason: string;
}

export interface AdjustPacingResponse {
  success: true;
  data: {
    success: boolean;
    adjustedPlan: RoutePlanDraft;
    changes: Array<{
      persona: Persona;
      action: Action;
      reason: string;
      changes: PacingChange[];
    }>;
    message: string;
  };
}

// ==================== 接口 3: 路线节点替换 ====================

export interface UnavailableNode {
  nodeId: string; // 注意：这里是 segmentId，不是 placeId
  reason: string;
}

export interface ReplaceNodesRequest {
  tripId?: string;
  plan: RoutePlanDraft;
  worldContext: WorldModelContext;
  unavailableNodes: UnavailableNode[];
}

export interface NodeReplacement {
  original: string;
  replacement: string;
  reason: string;
}

export interface ReplaceNodesResponse {
  success: true;
  data: {
    success: boolean;
    replacedPlan: RoutePlanDraft;
    replacements: Array<{
      persona: Persona;
      action: Action;
      reason: string;
      replacements: NodeReplacement[];
    }>;
    message: string;
  };
}

// ==================== 规划策略类型 ====================

export interface PlanningPolicy {
  pacing: {
    hpMax: number;
    regenRate: number;
    walkSpeedMin: number;
    forcedRestIntervalMin: number;
  };
  constraints: {
    maxSingleWalkMin: number;
    requireWheelchairAccess: boolean;
    forbidStairs: boolean;
  };
  weights: {
    tagAffinity: Record<string, number>;
    walkPainPerMin: number;
    overtimePenaltyPerMin: number;
  };
}

export interface ScheduleStop {
  kind: 'POI' | 'REST' | 'MEAL' | 'TRANSIT';
  id: string;
  name?: string;
  startMin: number;
  endMin: number;
  lat?: number;
  lng?: number;
  transitIn?: {
    mode: 'WALK' | 'TRANSIT' | 'TAXI';
    durationMin: number;
  };
}

export interface ScheduleMetrics {
  totalTravelMin: number;
  totalWalkMin: number;
  totalTransfers: number;
  totalQueueMin: number;
  overtimeMin: number;
  hpEnd: number;
}

export interface DayScheduleResult {
  stops: ScheduleStop[];
  metrics: ScheduleMetrics;
}

export interface RobustnessMetrics {
  timeWindowMissProb: number;
  windowWaitProb: number;
  completionRateP10: number;
  onTimeProb: number;
  totalBufferMin: number;
  tightestNode: string;
  riskLevel: RiskLevel;
}

export interface OptimizationSuggestion {
  type: SuggestionType;
  poiId?: string;
  minutes?: number;
  reason: string;
}

export interface Candidate {
  id: string;
  title: string;
  description: string;
  suggestion?: OptimizationSuggestion;
  schedule?: DayScheduleResult;
  metrics?: RobustnessMetrics;
  deltaSummary?: {
    missDelta: number;
    waitDelta: number;
    completionP10Delta: number;
    onTimeDelta: number;
  };
  impactCost?: {
    timeShiftAbsSumMin: number;
    movedStopCount: number;
    poiOrderChanged: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  confidence?: {
    level: ConfidenceLevel;
    reason: string;
  };
  explainTopDrivers?: Array<{
    driver: string;
    deltaPp: number;
  }>;
  action?: OptimizationSuggestion;
}

// ==================== 接口 4: 评估稳健度 ====================

export interface EvaluateDayRequest {
  placeIds?: number[];
  poiLookup?: Record<string, any>;
  policy: PlanningPolicy;
  schedule: DayScheduleResult;
  dayEndMin: number;
  dateISO: string;
  dayOfWeek: number;
  config?: {
    samples?: number;
    seed?: number;
  };
}

export interface EvaluateDayResponse {
  success: true;
  data: {
    metrics: RobustnessMetrics;
    schedule: DayScheduleResult;
  };
}

// ==================== 接口 5: 生成候选方案 ====================

export interface GenerateCandidatesRequest {
  metrics: RobustnessMetrics;
  schedule: DayScheduleResult;
}

export interface GenerateCandidatesResponse {
  success: true;
  data: {
    candidates: Candidate[];
    suggestions: OptimizationSuggestion[];
  };
}

// ==================== 接口 6: 评估候选方案 ====================

export interface EvaluateCandidatesRequest {
  placeIds?: number[];
  poiLookup?: Record<string, any>;
  policy: PlanningPolicy;
  schedule: DayScheduleResult;
  dayEndMin: number;
  dateISO: string;
  dayOfWeek: number;
  config?: {
    samples?: number;
    seed?: number;
  };
  suggestions: OptimizationSuggestion[];
}

export interface EvaluateCandidatesResponse {
  success: true;
  data: {
    base: Candidate;
    candidates: Candidate[];
    winnerId: string;
    riskWarning?: string;
  };
}

// ==================== 接口 7: What-If 评估（完整） ====================

export interface WhatIfEvaluateRequest {
  placeIds?: number[];
  poiLookup?: Record<string, any>;
  policy: PlanningPolicy;
  schedule: DayScheduleResult;
  dayEndMin: number;
  dateISO: string;
  dayOfWeek: number;
  config?: {
    samples?: number;
    seed?: number;
  };
  suggestions?: OptimizationSuggestion[];
  budgetStrategy?: {
    baseSamples?: number;
    candidateSamples?: number;
    confirmSamples?: number;
  };
}

export interface WhatIfEvaluateResponse {
  success: true;
  data: {
    base: Candidate;
    candidates: Candidate[];
    winnerId: string;
    riskWarning?: string;
  };
}

// ==================== 接口 8: 应用候选方案 ====================

export interface ApplyCandidateRequest {
  report: EvaluateCandidatesResponse['data'];
  candidateId: string;
}

export interface ApplyCandidateResponse {
  success: true;
  data: {
    schedule: DayScheduleResult;
  };
}

// ==================== 接口 9: 复评 ====================

export interface ReEvaluateRequest {
  policy: PlanningPolicy;
  appliedSchedule: DayScheduleResult;
  dayEndMin: number;
  dateISO: string;
  dayOfWeek: number;
  poiLookup?: Record<string, any>;
  reEvaluateSamples?: number;
  config?: {
    seed?: number;
  };
}

export interface ReEvaluateResponse {
  success: true;
  data: {
    metrics: RobustnessMetrics;
  };
}

