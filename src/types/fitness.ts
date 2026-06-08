/**
 * 体能评估相关类型定义
 * @module types/fitness
 */

// ==================== 问卷相关 ====================

/** 问卷选项 */
export interface QuestionOption {
  value: number;
  label: string;
  labelZh: string;
  emoji: string;
}

/** 问卷问题 */
export interface Question {
  id: string;
  question: string;
  questionZh: string;
  options: QuestionOption[];
}

/** 问卷响应 */
export interface QuestionnaireResponse {
  questions: Question[];
  ageQuestion: Question;
}

/** 问卷提交数据 */
export interface QuestionnaireSubmitData {
  userId: string;
  weeklyExercise: number;      // 0-4
  longestHike: number;         // 0-4
  elevationExperience: number; // 0-4
  ageGroupIndex: number;       // 0-4
  riskTolerance?: 'low' | 'medium' | 'high';
  highAltitudeExperience?: 'none' | 'basic' | 'advanced';
  pace?: 'slow' | 'relaxed' | 'normal' | 'fast' | 'intense';
}

/** 问卷答案（前端使用） */
export interface QuestionnaireAnswers {
  weeklyExercise?: number;
  longestHike?: number;
  elevationExperience?: number;
  ageGroupIndex?: number;
  riskTolerance?: 'low' | 'medium' | 'high';
  highAltitudeExperience?: 'none' | 'basic' | 'advanced';
  pace?: 'slow' | 'relaxed' | 'normal' | 'fast' | 'intense';
}

// ==================== 体能模型相关 ====================

/** 体能等级 */
export type FitnessLevel = 'LOW' | 'MEDIUM_LOW' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH';

/** 置信度等级 */
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** 年龄段 */
export type AgeGroup = '18-29' | '30-39' | '40-49' | '50-59' | '60+';

/** 评估来源 */
export type AssessmentSource = 
  | 'QUESTIONNAIRE' 
  | 'HISTORICAL' 
  | 'WEARABLE' 
  | 'FIRST_DAY_TEST' 
  | 'USER_SELF_REPORT' 
  | 'DEFAULT';

/** 节奏偏好 */
export type PacePreference = 'SLOW' | 'MEDIUM' | 'FAST';

/** 风险承受度 */
export type RiskTolerance = 'LOW' | 'MEDIUM' | 'HIGH';

/** 高海拔经验 */
export type HighAltitudeExperience = 'NONE' | 'BASIC' | 'ADVANCED';

/** 缓冲日偏好 */
export type BufferDayBias = 'LOW' | 'MEDIUM' | 'HIGH';

// ==================== 高海拔适应相关 (Phase 2) ====================

/** 高反敏感度 */
export type AMSSensitivity = 'LOW' | 'MEDIUM' | 'HIGH';

/** 高海拔适应状态 */
export interface AcclimatizationState {
  /** 当前已适应的最高海拔（米） */
  acclimatizedAltitudeM: number;
  /** 在当前海拔停留天数 */
  daysAtCurrentAltitude: number;
  /** 累积适应天数 */
  totalAcclimatizationDays: number;
  /** 适应效率（0-1） */
  acclimatizationEfficiency: number;
  /** 是否有高反症状 */
  hasAMSSymptoms?: boolean;
  /** 上次海拔变化日期 */
  lastAltitudeChangeDate?: string;
}

/** 高海拔适应规则 */
export interface AcclimatizationRule {
  /** 海拔阈值（米） */
  altitudeThresholdM: number;
  /** 每适应1天可上升的米数 */
  metersPerAcclimatizationDay: number;
  /** 最大单日睡眠海拔增益（米） */
  maxDailySleepingAltitudeGainM: number;
}

/** 人体能力模型 */
export interface HumanCapabilityModel {
  // 基础标识
  profileId: string;
  
  // 核心能力参数
  maxDailyAscentM: number;        // 单日最大爬升（米）
  rollingAscent3DaysM: number;    // 3天滚动爬升阈值（米）
  maxSlopePct: number;            // 最大可接受坡度（%）
  
  // 偏好设置
  preferredPace: PacePreference;
  riskTolerance: RiskTolerance;
  highAltitudeExperience: HighAltitudeExperience;
  
  // 高海拔相关
  maxElevationM?: number;
  requiresGradualAscent?: boolean;
  
  // 缓冲和天气
  bufferDayBias?: BufferDayBias;
  weatherRiskWeight?: number;     // 0-1
  
  // 年龄相关
  age?: number;
  ageGroup?: AgeGroup;
  ageModifier?: number;           // 0.6-1.0
  
  // 评估相关
  fitnessScore?: number;          // 0-100
  fitnessLevel?: FitnessLevel;
  assessmentSource?: AssessmentSource;
  confidenceLevel?: ConfidenceLevel;
  completedTripCount?: number;

  // ========== Phase 2 新增字段 ==========
  
  /** 高海拔适应状态 */
  acclimatizationState?: AcclimatizationState;
  /** 适应速率修正（0.7-1.3，基于个人体质） */
  acclimatizationRateModifier?: number;
  /** 高反敏感度 */
  amsSensitivity?: AMSSensitivity;
}

/** 体能画像维度 */
export interface FitnessDimensions {
  climbingAbility: number;      // 爬升能力（0-100）
  endurance: number;            // 耐力（0-100）
  recoverySpeed: number;        // 恢复速度（0-100）
}

/** 年龄信息 */
export interface AgeInfo {
  ageGroup: AgeGroup;
  modifier: number;
  description: string;
}

/** 体能画像 */
export interface FitnessProfile {
  overallScore: number;           // 总评分（0-100）
  fitnessLevel: FitnessLevel;     // 体能等级
  levelDescription: string;       // 等级描述
  confidence: ConfidenceLevel;    // 置信度
  confidenceDescription: string;  // 置信度描述
  dimensions: FitnessDimensions;
  recommendedDailyAscentM: number;
  recommendedDailyDistanceKm: number;
  completedTripCount: number;
  ageInfo?: AgeInfo;
  /** 最长连续徒步天数档位 0–4（徒步详情 longestHike query） */
  longestHikeDays?: number;
  /** 部分后端字段名 */
  longestHike?: number;
}

/** 问卷提交结果 */
export interface QuestionnaireSubmitResult {
  success: boolean;
  model: HumanCapabilityModel;
  profile: FitnessProfile;
}

// ==================== 反馈相关 ====================

/** 体力感受评分 */
export type EffortRating = 1 | 2 | 3; // 1=太累 2=刚好 3=还能走

/** 行程调整类型 */
export type AdjustmentType = 
  | 'skipped_spots'      // 跳过景点
  | 'extended_rest'      // 延长休息
  | 'shortened_hike'     // 缩短徒步
  | 'changed_transport'  // 改变交通
  | 'other';             // 其他

/** 反馈提交数据 */
export interface FeedbackSubmitData {
  tripId: string;
  actualEffortRating: EffortRating;
  completedAsPlanned: boolean;
  adjustmentsMade?: AdjustmentType[];
}

/** 反馈提交结果 */
export interface FeedbackSubmitResult {
  success: boolean;
  message: string;
}

/** 近期趋势 */
export type RecentTrend = 'improving' | 'stable' | 'declining';

/** 反馈统计 */
export interface FeedbackStats {
  totalFeedbacks: number;
  avgEffortRating: number;
  completionRate: number;
  recentTrend: RecentTrend;
}

// ==================== 校准相关 ====================

/** 校准变化详情 */
export interface CalibrationChanges {
  oldMaxDailyAscentM: number;
  newMaxDailyAscentM: number;
  calibrationFactor: number;
  feedbackCount: number;
}

/** 校准结果 */
export interface CalibrationResult {
  success: boolean;
  calibrated: boolean;
  message: string;
  changes?: CalibrationChanges;
}

// ==================== 问卷进度相关 ====================

/** 问卷进度状态 */
export interface QuestionnaireProgress {
  currentStep: number;
  answers: QuestionnaireAnswers;
  startedAt: number;
}

// ==================== 提示触发相关 ====================

/** 提示触发来源 */
export type PromptTrigger = 
  | 'trip_created'      // 行程创建完成后
  | 'trip_completed'    // 行程结束后
  | 'settings_page'     // 访问设置页面
  | 'health_score_low'  // 健康度评分偏低时
  | 'dashboard_prompt'  // Dashboard 首页提示
  | 'login'             // 登录后提示
  | 'manual';           // 用户主动触发

// ==================== 疲劳计算相关 (Phase 2) ====================

/** 住宿类型 */
export type AccommodationType = 'camping' | 'basic' | 'comfortable' | 'luxury';

/** 每日疲劳记录 */
export interface DayFatigueRecord {
  /** 日期索引 */
  dayIndex: number;
  /** 当日疲劳指数 */
  fatigueIndex: number;
  /** 是否休息日 */
  isRestDay: boolean;
  /** 累积疲劳 */
  cumulativeFatigue: number;
}

/** 恢复条件 */
export interface RecoveryConditions {
  /** 住宿类型 */
  accommodationType?: AccommodationType;
  /** 是否有热水淋浴 */
  hasHotShower?: boolean;
  /** 是否有充足休息 */
  hasAdequateRest?: boolean;
  /** 营养质量（0-1） */
  nutritionQuality?: number;
  /** 睡眠海拔（米） */
  sleepingAltitudeM?: number;
}

/** 疲劳上下文 */
export interface FatigueContext {
  /** 当日索引 */
  dayIndex: number;
  /** 前一日疲劳指数 */
  previousDayFatigue?: number;
  /** 累积疲劳 */
  cumulativeFatigue?: number;
  /** 是否首日 */
  isFirstDay?: boolean;
  
  // ========== Phase 2 新增字段 ==========
  
  /** 前几天的疲劳指数历史 */
  fatigueHistory?: DayFatigueRecord[];
  /** 是否是休息日 */
  isRestDay?: boolean;
  /** 睡眠质量（0-1） */
  sleepQuality?: number;
  /** 恢复条件 */
  recoveryConditions?: RecoveryConditions;
}

// ==================== 地形相关 (Phase 2) ====================

/** 地形类型（扩展） */
export type TerrainType = 
  // 原有类型
  | 'easy' 
  | 'moderate' 
  | 'technical' 
  | 'extreme'
  // Phase 2 新增类型
  | 'alpine'    // 高山地形
  | 'glacier'   // 冰川地形
  | 'desert'    // 沙漠地形
  | 'jungle'    // 丛林地形
  | 'coastal'   // 海岸地形
  | 'scree';    // 碎石坡地形

/** 风险等级 */
export type TerrainRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** 地形特性 */
export interface TerrainCharacteristics {
  /** 地形类型 */
  type: TerrainType;
  /** 疲劳系数 */
  fatigueFactor: number;
  /** 速度乘数 */
  speedMultiplier: number;
  /** 风险等级 */
  riskLevel: TerrainRiskLevel;
  /** 英文描述 */
  description: string;
  /** 中文描述 */
  descriptionZh: string;
  /** 所需装备 */
  requiredGear?: string[];
  /** 最佳季节（月份） */
  bestSeasons?: number[];
}

/** 地形特性配置映射 */
export const TERRAIN_CHARACTERISTICS: Record<TerrainType, TerrainCharacteristics> = {
  easy: {
    type: 'easy',
    fatigueFactor: 1.0,
    speedMultiplier: 1.0,
    riskLevel: 'LOW',
    description: 'Well-maintained paths, gentle terrain',
    descriptionZh: '维护良好的步道，平缓地形',
  },
  moderate: {
    type: 'moderate',
    fatigueFactor: 1.2,
    speedMultiplier: 0.85,
    riskLevel: 'LOW',
    description: 'Some elevation changes, uneven surfaces',
    descriptionZh: '有一定起伏，地面不平',
  },
  technical: {
    type: 'technical',
    fatigueFactor: 1.5,
    speedMultiplier: 0.7,
    riskLevel: 'MEDIUM',
    description: 'Requires scrambling, route-finding skills',
    descriptionZh: '需要攀爬，需具备路线识别能力',
    requiredGear: ['hiking poles', 'gloves'],
  },
  extreme: {
    type: 'extreme',
    fatigueFactor: 2.0,
    speedMultiplier: 0.5,
    riskLevel: 'HIGH',
    description: 'Dangerous terrain, specialized skills required',
    descriptionZh: '危险地形，需要专业技能',
    requiredGear: ['helmet', 'rope', 'harness'],
  },
  alpine: {
    type: 'alpine',
    fatigueFactor: 1.6,
    speedMultiplier: 0.65,
    riskLevel: 'MEDIUM',
    description: 'High altitude rocky terrain above tree line',
    descriptionZh: '林线以上的高海拔岩石地形',
    requiredGear: ['warm layers', 'sun protection'],
    bestSeasons: [6, 7, 8, 9],
  },
  glacier: {
    type: 'glacier',
    fatigueFactor: 1.8,
    speedMultiplier: 0.55,
    riskLevel: 'HIGH',
    description: 'Ice and snow terrain, crevasse risk',
    descriptionZh: '冰雪地形，有冰裂缝风险',
    requiredGear: ['crampons', 'ice axe', 'rope', 'harness'],
    bestSeasons: [5, 6, 9, 10],
  },
  desert: {
    type: 'desert',
    fatigueFactor: 1.4,
    speedMultiplier: 0.75,
    riskLevel: 'MEDIUM',
    description: 'Hot, arid terrain with limited water',
    descriptionZh: '炎热干旱地形，水源有限',
    requiredGear: ['sun protection', 'extra water capacity'],
    bestSeasons: [3, 4, 10, 11],
  },
  jungle: {
    type: 'jungle',
    fatigueFactor: 1.5,
    speedMultiplier: 0.6,
    riskLevel: 'MEDIUM',
    description: 'Dense vegetation, humid conditions',
    descriptionZh: '茂密植被，潮湿环境',
    requiredGear: ['machete', 'insect repellent', 'rain gear'],
    bestSeasons: [1, 2, 12],
  },
  coastal: {
    type: 'coastal',
    fatigueFactor: 1.1,
    speedMultiplier: 0.9,
    riskLevel: 'LOW',
    description: 'Beach and cliff paths, tidal considerations',
    descriptionZh: '海滩和悬崖路径，需考虑潮汐',
    bestSeasons: [4, 5, 6, 9, 10],
  },
  scree: {
    type: 'scree',
    fatigueFactor: 1.7,
    speedMultiplier: 0.5,
    riskLevel: 'MEDIUM',
    description: 'Loose rock slopes, unstable footing',
    descriptionZh: '碎石斜坡，脚下不稳',
    requiredGear: ['gaiters', 'sturdy boots'],
  },
};

// ==================== 失败风险评估相关类型 ====================

/**
 * 失败原因类型
 * 支持预定义类型和自定义字符串
 */
export type FailureReasonType =
  // 体能相关
  | 'fatigue'              // 疲劳过度
  | 'altitude_sickness'    // 高原反应
  | 'dehydration'          // 脱水
  | 'hypothermia'          // 体温过低
  | 'heat_exhaustion'      // 中暑
  | 'injury'               // 受伤
  // 环境相关
  | 'weather'              // 恶劣天气
  | 'avalanche'            // 雪崩
  | 'rockfall'             // 落石
  | 'flash_flood'          // 山洪
  | 'lightning'            // 雷击
  | 'wildfire'             // 野火
  // 技术相关
  | 'technical_difficulty' // 技术难度超出能力
  | 'route_loss'           // 迷路
  | 'equipment_failure'    // 装备故障
  | 'gear_insufficient'    // 装备不足
  // 时间相关
  | 'time_constraint'      // 时间不足
  | 'darkness'             // 天黑
  // 其他
  | 'access_denied'        // 禁止通行
  | 'wildlife'             // 野生动物威胁
  | 'other'                // 其他
  | string;                // 允许自定义原因

/**
 * 救援难度等级
 */
export type RescueDifficultyType =
  | 'EXTREME'    // 极高：需要专业高山救援队、直升机，耗时>24小时
  | 'VERY_HIGH'  // 非常高：需要专业救援队，耗时12-24小时
  | 'HIGH'       // 高：需要救援队介入，耗时6-12小时
  | 'MEDIUM'     // 中等：可通过普通救援到达，耗时2-6小时
  | 'LOW';       // 低：容易到达，耗时<2小时

/**
 * 失败风险评估画像
 */
export interface FailureProfile {
  /** 主要失败原因 */
  primaryReason: FailureReasonType;
  /** 次要失败原因列表 */
  secondaryReasons?: FailureReasonType[];
  /** 失败概率（0-1） */
  probability: number;
  /** 救援难度 */
  rescueDifficulty: RescueDifficultyType;
  /** 预计救援时间（小时） */
  estimatedRescueTimeHours?: number;
  /** 风险描述 */
  description?: string;
  /** 中文风险描述 */
  descriptionZh?: string;
  /** 缓解措施建议 */
  mitigations?: string[];
  /** 关联的地形段落 */
  affectedSegments?: {
    startKm: number;
    endKm: number;
    reason: FailureReasonType;
  }[];
}

/**
 * 救援难度配置
 */
export const RESCUE_DIFFICULTY_CONFIG: Record<RescueDifficultyType, {
  label: string;
  labelZh: string;
  description: string;
  descriptionZh: string;
  colorClass: string;
  estimatedHours: { min: number; max: number };
}> = {
  EXTREME: {
    label: 'Extreme',
    labelZh: '极高',
    description: 'Requires specialized alpine rescue team, helicopter',
    descriptionZh: '需要专业高山救援队、直升机',
    colorClass: 'bg-red-600 text-white',
    estimatedHours: { min: 24, max: 72 },
  },
  VERY_HIGH: {
    label: 'Very High',
    labelZh: '非常高',
    description: 'Requires professional rescue team',
    descriptionZh: '需要专业救援队',
    colorClass: 'bg-red-500 text-white',
    estimatedHours: { min: 12, max: 24 },
  },
  HIGH: {
    label: 'High',
    labelZh: '高',
    description: 'Rescue team intervention needed',
    descriptionZh: '需要救援队介入',
    colorClass: 'bg-orange-500 text-white',
    estimatedHours: { min: 6, max: 12 },
  },
  MEDIUM: {
    label: 'Medium',
    labelZh: '中等',
    description: 'Standard rescue accessible',
    descriptionZh: '普通救援可达',
    colorClass: 'bg-yellow-500 text-black',
    estimatedHours: { min: 2, max: 6 },
  },
  LOW: {
    label: 'Low',
    labelZh: '低',
    description: 'Easy access for rescue',
    descriptionZh: '救援容易到达',
    colorClass: 'bg-green-500 text-white',
    estimatedHours: { min: 0.5, max: 2 },
  },
};

/**
 * 失败原因配置
 */
export const FAILURE_REASON_CONFIG: Record<string, {
  label: string;
  labelZh: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  fatigue: { label: 'Fatigue', labelZh: '疲劳过度', icon: '😰', severity: 'medium' },
  altitude_sickness: { label: 'Altitude Sickness', labelZh: '高原反应', icon: '🏔️', severity: 'high' },
  dehydration: { label: 'Dehydration', labelZh: '脱水', icon: '💧', severity: 'high' },
  hypothermia: { label: 'Hypothermia', labelZh: '体温过低', icon: '🥶', severity: 'critical' },
  heat_exhaustion: { label: 'Heat Exhaustion', labelZh: '中暑', icon: '🥵', severity: 'high' },
  injury: { label: 'Injury', labelZh: '受伤', icon: '🩹', severity: 'high' },
  weather: { label: 'Weather', labelZh: '恶劣天气', icon: '⛈️', severity: 'high' },
  avalanche: { label: 'Avalanche', labelZh: '雪崩', icon: '❄️', severity: 'critical' },
  rockfall: { label: 'Rockfall', labelZh: '落石', icon: '🪨', severity: 'high' },
  flash_flood: { label: 'Flash Flood', labelZh: '山洪', icon: '🌊', severity: 'critical' },
  lightning: { label: 'Lightning', labelZh: '雷击', icon: '⚡', severity: 'critical' },
  wildfire: { label: 'Wildfire', labelZh: '野火', icon: '🔥', severity: 'critical' },
  technical_difficulty: { label: 'Technical Difficulty', labelZh: '技术难度', icon: '🧗', severity: 'medium' },
  route_loss: { label: 'Route Loss', labelZh: '迷路', icon: '🧭', severity: 'medium' },
  equipment_failure: { label: 'Equipment Failure', labelZh: '装备故障', icon: '🔧', severity: 'medium' },
  gear_insufficient: { label: 'Insufficient Gear', labelZh: '装备不足', icon: '🎒', severity: 'medium' },
  time_constraint: { label: 'Time Constraint', labelZh: '时间不足', icon: '⏰', severity: 'medium' },
  darkness: { label: 'Darkness', labelZh: '天黑', icon: '🌙', severity: 'medium' },
  access_denied: { label: 'Access Denied', labelZh: '禁止通行', icon: '🚫', severity: 'low' },
  wildlife: { label: 'Wildlife Threat', labelZh: '野生动物威胁', icon: '🐻', severity: 'medium' },
  other: { label: 'Other', labelZh: '其他', icon: '❓', severity: 'low' },
};
