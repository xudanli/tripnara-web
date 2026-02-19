/**
 * V2 优化系统类型定义
 * 
 * @module types/optimization-v2
 * @description 支持 8 维效用函数、团队协作、实时状态的类型系统
 * @version 2.0.0 - 匹配后端 API 文档
 */

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

/** 8 维统一配置：权重 key -> 展示 label（用于权重滑块、雷达图、对比图等） */
export const DIMENSION_LABELS: Record<keyof ObjectiveFunctionWeights, string> = {
  safety: '安全',
  experience: '体验',
  philosophy: '哲学',
  timeSlack: '余量',
  fatigueRisk: '疲劳',
  weatherRisk: '天气',
  budgetRisk: '预算',
  crowdAvoidance: '避流',
};

/** breakdown 的 key -> 权重的 key 映射（API 返回 budgetScore/crowdScore，权重用 budgetRisk/crowdAvoidance） */
export const BREAKDOWN_TO_WEIGHT_KEY: Record<string, keyof ObjectiveFunctionWeights> = {
  safetyScore: 'safety',
  experienceScore: 'experience',
  philosophyScore: 'philosophy',
  timeSlackScore: 'timeSlack',
  fatigueRiskScore: 'fatigueRisk',
  weatherRiskScore: 'weatherRisk',
  budgetScore: 'budgetRisk',
  crowdScore: 'crowdAvoidance',
};

// ==================== 世界模型上下文 (V2) ====================

/**
 * 天气信息
 */
export interface WeatherInfo {
  temperature: number;        // 温度 (°C)
  windSpeed: number;          // 风速 (m/s)
  precipitation: number;      // 降水概率 (0-1)
}

/**
 * 地形信息
 */
export interface TerrainInfo {
  elevation: number;          // 海拔 (m)
  gradient: number;           // 坡度 (%)
}

/**
 * 危险区域
 */
export interface HazardInfo {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
}

/**
 * 物理环境模型 (V2)
 */
export interface PhysicalModelV2 {
  weather: WeatherInfo;
  terrain: TerrainInfo;
  hazards: HazardInfo[];
}

/**
 * 人体状态模型 (V2)
 */
export interface HumanModelV2 {
  fitnessLevel: number;       // 体能水平 (0-1)
  currentFatigue: number;     // 当前疲劳度 (0-1)
  maxDailyAscentM: number;    // 每日最大爬升 (m)
  riskTolerance: number;      // 风险承受度 (0-1)
}

/**
 * 路线方向模型 (V2)
 */
export interface RouteDirectionModelV2 {
  id: string;
  philosophy: {
    scenic?: boolean;
    challenging?: boolean;
    cultural?: boolean;
    [key: string]: boolean | undefined;
  } | string;
  constraints: {
    maxDailyDrivingHours?: number;
    maxDailyWalkingHours?: number;
    [key: string]: number | undefined;
  };
}

/**
 * 世界模型上下文 (V2) - 匹配 API 文档
 */
export interface WorldModelContext {
  physical: PhysicalModelV2;
  human: HumanModelV2;
  routeDirection: RouteDirectionModelV2;
}

// ==================== 计划评估 ====================

/**
 * 路线段 - 每日行程中的一段
 */
export interface DaySegment {
  from: string;               // 起点
  to: string;                 // 终点
  distanceKm?: number;        // 距离 (km)
}

/**
 * 每日计划
 */
export interface DayPlan {
  dayNumber: number;          // 天数 (1-based)
  date: string;               // 日期 (YYYY-MM-DD)
  segments: DaySegment[];     // 当日路段
}

/**
 * 路线计划草稿 - 匹配后端 API 格式
 */
export interface RoutePlanDraft {
  /** 行程 ID */
  tripId: string;
  /** 路线方向 ID */
  routeDirectionId?: string;
  /** 每日计划 */
  days: DayPlan[];
  /** 元数据 */
  metadata?: {
    totalDays?: number;
    startDate?: string;
    endDate?: string;
    [key: string]: unknown;
  };
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
  /** 实际使用的权重；缺省时前端用默认值 */
  weightsUsed?: ObjectiveFunctionWeights;
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
 * 后端支持两种模式：1) plan + world 2) 仅 tripId/trip_id 由后端加载
 */
export interface OptimizePlanRequest {
  plan: RoutePlanDraft;
  world: WorldModelContext;
  /** 行程 ID，后端可据此加载 plan/world；有 tripId 时建议一并传递 */
  tripId?: string;
  trip_id?: string; // 后端兼容字段
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
 * 后端支持：plan+world 或 仅 tripId/trip_id 由后端加载
 */
export interface RiskAssessmentRequest {
  plan: RoutePlanDraft;
  world: WorldModelContext;
  /** Monte Carlo 样本数 (默认 1000) */
  sampleSize?: number;
  /** 行程 ID，供后端校验/加载 */
  tripId?: string;
  trip_id?: string;
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
 * 方式一：传 plan + world
 * 方式二：只传 tripId / trip_id / id，后端加载 plan 与 world 再协商
 * 若既未传 plan+world 也未传 tripId/trip_id/id，返回 400
 */
export interface NegotiationRequest {
  /** 待协商计划（方式一必填，与 world 同时传入） */
  plan?: RoutePlanDraft;
  /** 世界模型上下文（方式一必填，与 plan 同时传入） */
  world?: WorldModelContext;
  /** 行程 ID（方式二必填，后端加载 plan 与 world） */
  tripId?: string;
  /** 行程 ID，蛇形写法，与 tripId 等效 */
  trip_id?: string;
  /** 行程 ID，与 tripId 等效 */
  id?: string;
}

/**
 * 协商响应
 * POST /api/v2/user/optimization/negotiation
 */
export interface NegotiationResponse {
  /** 决策结果：批准 / 附条件批准 / 拒绝 / 需人工决策 */
  decision: NegotiationDecision;
  /** 共识度 (0-1)，前端 ×100 显示为百分比 */
  consensusLevel: number;
  /** 分歧所在（如 "NEPTUNE 支持 vs DRE 反对"），前端可改写为用户可读 */
  keyTradeoffs: string[];
  /** 附加条件（decision=APPROVE_WITH_CONDITIONS 时展示） */
  conditions?: string[];
  /** 需人类决策的点（decision=NEEDS_HUMAN 时展示） */
  humanDecisionPoints?: string[];
  /** 评估摘要 */
  evaluationSummary: {
    /** 安全守护者 Abu 评分 (0-1)，前端 ×100 显示 */
    abuUtility: number;
    /** 节奏守护者 Dre 评分 (0-1)，前端 ×100 显示 */
    dreUtility: number;
    /** 修复守护者 Neptune 评分 (0-1)，前端 ×100 显示 */
    neptuneUtility: number;
    /** 具体问题（分歧产生的原因），列表展示 */
    criticalConcerns: string[];
  };
  /** 投票结果（非负整数） */
  votingResult: {
    /** 赞成票数 */
    approve: number;
    /** 反对票数 */
    reject: number;
    /** 弃权票数 */
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
 * 初始化实时状态请求
 */
export interface InitializeRealtimeStateRequest {
  tripId: string;
  weather?: {
    temperatureC?: number;              // 温度 (°C)，默认 15
    windSpeedMs?: number;               // 风速 (m/s)，默认 5
    precipitationProbability?: number;  // 降水概率 (0-1)，默认 0.2
  };
  human?: {
    fatigueLevel?: number;              // 疲劳等级 (0-1)，默认 0.3
    altitudeAdaptation?: number;        // 海拔适应度 (0-1)，默认 0.7
  };
  roads?: Array<{
    roadId: string;
    status: 'OPEN' | 'RESTRICTED' | 'CLOSED';
    accessProbability?: number;         // 通行概率 (0-1)，默认 0.9
  }>;
}

/**
 * 初始化实时状态响应
 */
export interface InitializeRealtimeStateResponse {
  success: boolean;
  tripId: string;
  initializedAt: string;
  summary: {
    weatherReady: boolean;
    humanStateReady: boolean;
    roadsCount: number;
  };
}

/**
 * 检查状态是否存在响应
 */
export interface StateExistsResponse {
  exists: boolean;
  tripId: string;
}

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
