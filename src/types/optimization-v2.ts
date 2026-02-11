/**
 * V2 优化系统类型定义
 * 
 * @module types/optimization-v2
 * @description 支持 8 维效用函数、团队协作、实时状态的类型系统
 */

import type { WorldModelContext } from './strategy';

// 重新导出 WorldModelContext 供外部使用
export type { WorldModelContext };

// ==================== 效用函数权重 ====================

/**
 * 8 维目标函数权重配置
 * 所有权重之和应为 1.0
 */
export interface ObjectiveFunctionWeights {
  /** 安全权重 (默认 0.25) */
  safety: number;
  /** 体验权重 (默认 0.20) */
  experience: number;
  /** 哲学契合度权重 (默认 0.15) */
  philosophy: number;
  /** 时间余量权重 (默认 0.10) */
  timeSlack: number;
  /** 疲劳风险权重 (默认 0.10) */
  fatigueRisk: number;
  /** 天气风险权重 (默认 0.10) */
  weatherRisk: number;
  /** 预算风险权重 (默认 0.05) */
  budgetRisk: number;
  /** 避人流权重 (默认 0.05) */
  crowdAvoidance: number;
}

/** 默认权重配置 */
export const DEFAULT_WEIGHTS: ObjectiveFunctionWeights = {
  safety: 0.25,
  experience: 0.20,
  philosophy: 0.15,
  timeSlack: 0.10,
  fatigueRisk: 0.10,
  weatherRisk: 0.10,
  budgetRisk: 0.05,
  crowdAvoidance: 0.05,
};

// ==================== 计划评估 ====================

/**
 * 计划草案（简化版，对接后端 RoutePlanDraft）
 */
/**
 * 路线段（Segment）
 */
export interface RouteSegment {
  id: string;
  dayIndex: number;
  date?: string;
  items: RoutePlanItem[];
}

/**
 * 路线计划草稿 - 匹配后端 API 格式
 */
export interface RoutePlanDraft {
  /** 行程 ID（必须） */
  tripId: string;
  /** 路线方向 ID */
  routeDirectionId?: string;
  /** 路线段列表 */
  segments: RouteSegment[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

export interface RoutePlanItem {
  id: string;
  placeId?: number;
  name: string;
  type: 'ACTIVITY' | 'TRANSPORT' | 'REST' | 'MEAL';
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

/**
 * 评估请求
 */
export interface EvaluatePlanRequest {
  plan: RoutePlanDraft;
  world: WorldModelContext;
  weights?: Partial<ObjectiveFunctionWeights>;
}

/**
 * 评估响应
 */
export interface EvaluatePlanResponse {
  /** 总效用值 (0-1) */
  totalUtility: number;
  /** 各维度得分 */
  breakdown: {
    safetyScore: number;
    experienceScore: number;
    philosophyScore: number;
    timeSlackScore: number;
    fatigueRiskScore: number;
    weatherRiskScore: number;
    budgetScore: number;
    crowdScore: number;
  };
  /** 实际使用的权重 */
  weightsUsed: ObjectiveFunctionWeights;
  /** 评估时间 */
  timestamp: string;
}

/**
 * 计划比较请求
 */
export interface ComparePlansRequest {
  planA: RoutePlanDraft;
  planB: RoutePlanDraft;
  world: WorldModelContext;
}

/**
 * 计划比较响应
 */
export interface ComparePlansResponse {
  /** 更优计划 */
  preferredPlan: 'A' | 'B' | 'EQUAL';
  /** 效用差值 (A - B) */
  utilityDifference: number;
  /** 各维度对比 */
  dimensionComparison: Record<string, {
    a: number;
    b: number;
    winner: 'A' | 'B' | 'EQUAL';
  }>;
}

/**
 * 优化请求
 */
export interface OptimizePlanRequest {
  plan: RoutePlanDraft;
  world: WorldModelContext;
}

/**
 * 优化变更记录
 */
export interface OptimizationChange {
  type: 'CONSTRAINT_FIX' | 'SCHEDULE_OPT' | 'STABILITY_FIX';
  description: string;
  impact: {
    utilityDelta: number;
  };
}

/**
 * 优化响应
 */
export interface OptimizePlanResponse {
  originalPlan: RoutePlanDraft;
  optimizedPlan: RoutePlanDraft;
  changes: OptimizationChange[];
  finalUtility: number;
  processingTimeMs: number;
}

// ==================== 风险评估 ====================

/**
 * 风险评估请求
 */
export interface RiskAssessmentRequest {
  plan: RoutePlanDraft;
  world: WorldModelContext;
  /** Monte Carlo 样本数 (默认 1000) */
  sampleSize?: number;
}

/**
 * 风险因素
 */
export interface RiskFactor {
  factor: string;
  impact: number;
  probability: number;
}

/**
 * 风险评估响应
 */
export interface RiskAssessmentResponse {
  /** 期望效用 */
  expectedUtility: number;
  /** 95% 置信区间 */
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  /** 可行概率 P(feasible) */
  feasibilityProbability: number;
  /** 下行风险 P(U < threshold) */
  downsideRisk: number;
  /** 风险因素列表 */
  riskFactors: RiskFactor[];
  /** 建议 */
  recommendation: string;
}

// ==================== 三守护者协商 ====================

/**
 * 协商决策类型
 */
export type NegotiationDecision = 
  | 'APPROVE'                 // 批准
  | 'APPROVE_WITH_CONDITIONS' // 附条件批准
  | 'REJECT'                  // 拒绝
  | 'NEEDS_HUMAN';            // 需人类决策

/**
 * 协商请求
 */
export interface NegotiationRequest {
  plan: RoutePlanDraft;
  world: WorldModelContext;
}

/**
 * 协商响应
 */
export interface NegotiationResponse {
  /** 决策结果 */
  decision: NegotiationDecision;
  /** 共识度 (0-1) */
  consensusLevel: number;
  /** 关键权衡点 */
  keyTradeoffs: string[];
  /** 附加条件 */
  conditions?: string[];
  /** 需人类决策的点 */
  humanDecisionPoints?: string[];
  /** 评估摘要 */
  evaluationSummary: {
    abuUtility: number;
    dreUtility: number;
    neptuneUtility: number;
    criticalConcerns: string[];
  };
  /** 投票结果 */
  votingResult: {
    approve: number;
    reject: number;
    abstain: number;
  };
}

// ==================== 反馈系统 ====================

/**
 * 反馈类型
 */
export type FeedbackType = 
  | 'SATISFACTION_RATING'  // 满意度评分
  | 'FATIGUE_REPORT'       // 疲劳报告
  | 'PLAN_MODIFICATION'    // 计划修改
  | 'PREFERENCE_UPDATE'    // 偏好更新
  | 'TRIP_COMPLETION'      // 行程完成
  | 'EARLY_TERMINATION';   // 提前终止

/**
 * 修改类型
 */
export type ModificationType = 
  | 'SPLIT_DAY'        // 拆分天
  | 'INSERT_REST'      // 插入休息
  | 'REMOVE_ACTIVITY'  // 移除活动
  | 'REORDER'          // 重新排序
  | 'OTHER';           // 其他

/**
 * 反馈数据
 */
export interface FeedbackData {
  // 满意度评分 (1-5)
  overallSatisfaction?: number;
  safetyPerception?: number;
  experienceQuality?: number;
  pacingComfort?: number;
  philosophyMatch?: number;
  
  // 疲劳数据 (0-2)
  actualFatigueLevel?: number;
  predictedFatigueLevel?: number;
  
  // 修改数据
  modificationType?: ModificationType;
  modificationReason?: string;
  
  // 完成数据
  completionRate?: number;
  daysCompleted?: number;
  totalDays?: number;
}

/**
 * 反馈提交请求
 */
export interface SubmitFeedbackRequest {
  userId: string;
  tripId: string;
  type: FeedbackType;
  data: FeedbackData;
}

/**
 * 反馈提交响应
 */
export interface SubmitFeedbackResponse {
  success: boolean;
  feedbackId: string;
}

/**
 * 个性化偏好响应
 */
export interface UserPreferencesResponse {
  weights: ObjectiveFunctionWeights;
  /** 学习置信度 (0-1) */
  confidence: number;
  lastUpdated: string;
}

// ==================== 团队协作 ====================

/**
 * 团队类型
 */
export type TeamType = 
  | 'FAMILY'       // 家庭
  | 'FRIENDS'      // 朋友
  | 'EXPEDITION'   // 探险队
  | 'TOUR_GROUP'   // 旅行团
  | 'CUSTOM';      // 自定义

/**
 * 决策权重模式
 */
export type DecisionWeightMode = 
  | 'EQUAL'              // 平等
  | 'LEADER_DOMINANT'    // 领队主导
  | 'EXPERIENCE_WEIGHTED' // 经验加权
  | 'FITNESS_WEIGHTED'   // 体能加权
  | 'CUSTOM';            // 自定义

/**
 * 成员角色
 */
export type MemberRole = 'LEADER' | 'MEMBER' | 'OBSERVER';

/**
 * 体能等级
 */
export type FitnessLevelType = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

/**
 * 经验等级
 */
export type ExperienceLevelType = 'NOVICE' | 'SOME_EXPERIENCE' | 'EXPERIENCED' | 'EXPERT';

/**
 * 成员特殊约束
 */
export interface MemberConstraints {
  maxDailyAscentM?: number;
  maxDailyHours?: number;
  altitudeLimit?: number;
  restFrequency?: 'LOW' | 'MEDIUM' | 'HIGH';
  specialNeeds?: string[];
}

/**
 * 团队成员
 */
export interface TeamMember {
  userId: string;
  displayName: string;
  role: MemberRole;
  /** 决策权重 (0-1) */
  decisionWeight: number;
  fitnessLevel: FitnessLevelType;
  experienceLevel: ExperienceLevelType;
  personalWeights: ObjectiveFunctionWeights;
  specialConstraints?: MemberConstraints;
}

/**
 * 团队约束配置
 */
export interface TeamConstraintsConfig {
  /** 是否使用最弱链 */
  useWeakestLink: boolean;
  /** 最大可接受分歧 */
  maxAcceptableDisagreement: number;
  /** 需全票通过的决策类型 */
  unanimityRequired: string[];
}

/**
 * 创建团队请求
 */
export interface CreateTeamRequest {
  name: string;
  type: TeamType;
  decisionWeightMode: DecisionWeightMode;
  members: TeamMember[];
  teamConstraints?: TeamConstraintsConfig;
}

/**
 * 团队信息
 */
export interface Team {
  teamId: string;
  name: string;
  type: TeamType;
  decisionWeightMode: DecisionWeightMode;
  members: TeamMember[];
  teamConstraints?: TeamConstraintsConfig;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 团队协商响应
 */
export interface TeamNegotiationResponse {
  decision: NegotiationDecision;
  consensusLevel: number;
  /** 各成员评估 */
  memberEvaluations: Array<{
    userId: string;
    displayName: string;
    utility: number;
    concerns: string[];
  }>;
  /** 冲突列表 */
  conflicts: Array<{
    type: string;
    members: string[];
    description: string;
    suggestedResolution?: string;
  }>;
  teamConstraintsSatisfied: boolean;
}

/**
 * 团队综合权重响应
 */
export interface TeamWeightsResponse {
  weights: ObjectiveFunctionWeights;
  memberContributions: Array<{
    userId: string;
    displayName: string;
    contributionWeight: number;
  }>;
}

/**
 * 团队约束（最弱链）响应
 */
export interface TeamConstraintsResponse {
  constraints: MemberConstraints;
  constraintSources: Array<{
    constraint: string;
    sourceUserId: string;
    sourceDisplayName: string;
  }>;
}

// ==================== 实时状态 ====================

/**
 * 事件类型
 */
export type RealtimeEventType = 
  | 'WEATHER_CHANGE'
  | 'ROAD_STATUS_CHANGE'
  | 'HAZARD_DETECTED'
  | 'HUMAN_STATE_CHANGE'
  | 'FEASIBILITY_CHANGE';

/**
 * 严重级别
 */
export type SeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * 订阅请求
 */
export interface SubscribeRequest {
  tripId: string;
  userId: string;
  eventTypes: RealtimeEventType[];
  minSeverity: SeverityLevel;
  updateIntervalSeconds: number;
  includePredictions?: boolean;
}

/**
 * 订阅响应
 */
export interface SubscribeResponse {
  subscriptionId: string;
  nextUpdateAt: string;
}

/**
 * 可见度类型
 */
export type VisibilityLevel = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'VERY_POOR';

/**
 * 路况状态
 */
export type RoadStatusType = 'OPEN' | 'RESTRICTED' | 'CLOSED';

/**
 * 当前状态响应
 */
export interface RealtimeStateResponse {
  tripId: string;
  updatedAt: string;
  weather: {
    temperatureC: number;
    windSpeedMs: number;
    precipitationProbability: number;
    visibility: VisibilityLevel;
    alerts: string[];
  };
  roads: Array<{
    segmentId: string;
    status: RoadStatusType;
    accessProbability: number;
    warning?: string;
  }>;
  human: {
    fatigueLevel: number;
    altitudeSicknessRisk: number;
    recommendations: string[];
  };
}

/**
 * 预测状态响应
 */
export interface PredictedStateResponse {
  predictedAt: string;
  hoursAhead: number;
  weather: {
    temperatureC: { mean: number; stdDev: number };
    windSpeedMs: { mean: number; stdDev: number };
    precipitationProbability: number;
  };
  feasibility: {
    probability: number;
    riskFactors: string[];
  };
  confidence: number;
}

/**
 * 实地报告类型
 */
export type FieldReportType = 'WEATHER' | 'ROAD_STATUS' | 'HAZARD' | 'HUMAN_STATE';

/**
 * 实地报告请求
 */
export interface FieldReportRequest {
  type: FieldReportType;
  location?: {
    lat: number;
    lng: number;
    segmentId?: string;
  };
  data: {
    // WEATHER
    condition?: string;
    windStrong?: boolean;
    visibility?: string;
    // ROAD_STATUS
    roadCondition?: string;
    obstacle?: string;
    // HAZARD
    hazardType?: string;
    severity?: string;
    // HUMAN_STATE
    feeling?: string;
    symptoms?: string[];
  };
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * 实地报告响应
 */
export interface FieldReportResponse {
  reportId: string;
  thanksMessage: string;
}
