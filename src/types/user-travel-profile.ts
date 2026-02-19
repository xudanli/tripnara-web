/**
 * 用户旅行人格 (UserTravelProfile)
 *
 * 由 MemoryService 管理，存于 `user_travel_profile` 表。
 * 扩展字段存于 `extendedProfile` JSON 列。
 * 供决策、世界模型构建等内部服务使用。
 *
 * @module types/user-travel-profile
 */

// ==================== 驾驶疲劳偏好 ====================

/**
 * 驾驶疲劳偏好
 *
 * 用于驾驶时间安全评估（2-15-8 法则、疲劳公式）。
 * 存于 `extendedProfile.drivingFatiguePreferences`，
 * 供 API / 运营配置写入，暂不对普通用户开放表单。
 *
 * 系数用途：参与 EffectiveSafeHours = 8 × SleepFactor × RoadFactor × BreakFactor × StressFactor × AgeFactor，
 * 影响「今日行程偏紧」「超过安全上限」等驾驶安全提示阈值。
 */
export interface DrivingFatiguePreferences {
  /** 行程中典型睡眠质量（adequate=7-9h，系数 1.0） */
  sleepQuality?: 'adequate' | 'short' | 'poor' | 'very_poor';
  /** 休息习惯（regular=每2h休15min，系数 1.0） */
  breakHabit?: 'regular' | 'sometimes' | 'rarely' | 'none';
  /** 心理压力水平（low=熟悉路线，high=陌生/赶时间） */
  stressLevel?: 'low' | 'medium' | 'high';
}

/** sleepQuality 系数：adequate=1.0, short=0.85, poor=0.7, very_poor=0.5 */
export const SLEEP_QUALITY_FACTORS: Record<NonNullable<DrivingFatiguePreferences['sleepQuality']>, number> = {
  adequate: 1.0,
  short: 0.85,
  poor: 0.7,
  very_poor: 0.5,
};

/** breakHabit 系数：regular=1.0, sometimes=0.9, rarely=0.7, none=0.7 */
export const BREAK_HABIT_FACTORS: Record<NonNullable<DrivingFatiguePreferences['breakHabit']>, number> = {
  regular: 1.0,
  sometimes: 0.9,
  rarely: 0.7,
  none: 0.7,
};

/** stressLevel 系数：low=1.0, medium=0.9, high=0.8 */
export const STRESS_LEVEL_FACTORS: Record<NonNullable<DrivingFatiguePreferences['stressLevel']>, number> = {
  low: 1.0,
  medium: 0.9,
  high: 0.8,
};

// ==================== 扩展字段 ====================

/** 同行人信息 */
export interface CompanionsInfo {
  count: number;
  mobility?: string;
  ageRange?: string;
}

/** 设备信息 */
export interface DeviceInfo {
  platform: string;
  offlineCapable?: boolean;
}

/** 时间窗口 */
export interface TimeWindow {
  start: string;
  end: string;
  flexible?: boolean;
}

/** 情绪状态 */
export type EmotionalState = 'exploring' | 'decided' | 'anxious' | 'neutral';

/** 扩展配置（存于 extendedProfile JSON 列） */
export interface ExtendedProfile {
  companions?: CompanionsInfo;
  deviceInfo?: DeviceInfo;
  timeWindow?: TimeWindow;
  emotionalState?: EmotionalState;
  drivingFatiguePreferences?: DrivingFatiguePreferences;
  [key: string]: unknown;
}

// ==================== 核心偏好类型 ====================

export type PacePreference = 'SLOW' | 'MODERATE' | 'FAST';
export type AltitudeTolerance = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskToleranceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type TravelPhilosophy = 'SCENIC' | 'ADVENTURE' | 'RELAXED';
export type PreferredRouteType =
  | 'HIKING'
  | 'ROAD_TRIP'
  | 'SEA'
  | 'URBAN'
  | 'CULTURAL'
  | 'NATURE';

export type ProfileSource = 'explicit' | 'inferred' | 'mixed';

// ==================== 用户旅行人格 ====================

/**
 * 用户旅行人格
 *
 * 由 MemoryService 管理，存于 `user_travel_profile` 表。
 */
export interface UserTravelProfile {
  userId: string;

  // 核心偏好
  pacePreference?: PacePreference;
  altitudeTolerance?: AltitudeTolerance;
  riskTolerance?: RiskToleranceLevel;
  travelPhilosophy?: TravelPhilosophy;
  preferredRouteTypes?: PreferredRouteType[];

  // 扩展字段（存于 extendedProfile）
  companions?: CompanionsInfo;
  deviceInfo?: DeviceInfo;
  timeWindow?: TimeWindow;
  emotionalState?: EmotionalState;
  drivingFatiguePreferences?: DrivingFatiguePreferences;

  /** 置信度 (0-1) */
  confidence: number;
  /** 数据来源 */
  source: ProfileSource;
  /** 更新时间 */
  updatedAt: Date | string;

  /** 扩展配置（API 返回时可能扁平化或嵌套） */
  extendedProfile?: ExtendedProfile;
}
