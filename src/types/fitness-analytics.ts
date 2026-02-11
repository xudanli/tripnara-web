/**
 * 体能分析 Phase 2 类型定义
 * 趋势分析、异常检测、报告、可穿戴设备集成
 * 
 * @module types/fitness-analytics
 */

// ==================== 趋势分析相关 ====================

/** 趋势类型 */
export type TrendType = 
  | 'IMPROVING'         // 体能在提升
  | 'STABLE'            // 体能保持稳定
  | 'DECLINING'         // 体能在下降
  | 'INSUFFICIENT_DATA'; // 数据不足

/** 趋势分析结果 */
export interface FitnessTrend {
  /** 趋势方向 */
  trend: TrendType;
  /** 置信度 (0-1) */
  confidence: number;
  /** 斜率（变化速度） */
  slope: number;
  /** 分析周期（天） */
  periodDays: number;
  /** 数据点数量 */
  dataPoints: number;
  /** 英文总结 */
  summary: string;
  /** 中文总结 */
  summaryZh: string;
}

/** 趋势配置 */
export interface TrendConfig {
  /** 趋势类型 */
  type: TrendType;
  /** 显示标签 */
  label: string;
  /** 图标 */
  icon: string;
  /** 颜色类名 */
  colorClass: string;
  /** 背景颜色类名 */
  bgColorClass: string;
}

// ==================== 异常检测相关 ====================

/** 异常类型 */
export type AnomalyType = 
  | 'SUDDEN_DECLINE'       // 突然下降
  | 'CONSISTENT_OVERLOAD'  // 持续超负荷
  | 'RATING_INCONSISTENCY' // 评分不一致
  | 'UNUSUAL_PATTERN';     // 异常模式

/** 异常严重度 */
export type AnomalySeverity = 'HIGH' | 'MEDIUM' | 'LOW';

/** 单个异常 */
export interface FitnessAnomaly {
  /** 异常类型 */
  type: AnomalyType;
  /** 严重度 */
  severity: AnomalySeverity;
  /** 英文描述 */
  description: string;
  /** 中文描述 */
  descriptionZh: string;
  /** 检测时间 */
  detectedAt: string;
  /** 关联的行程ID */
  relatedTripIds: string[];
}

/** 异常检测结果 */
export interface AnomalyDetectionResult {
  /** 是否存在异常 */
  hasAnomaly: boolean;
  /** 异常列表 */
  anomalies: FitnessAnomaly[];
}

/** 异常类型配置 */
export interface AnomalyTypeConfig {
  /** 异常类型 */
  type: AnomalyType;
  /** 显示标签 */
  label: string;
  /** 图标 */
  icon: string;
  /** 建议操作 */
  suggestions: string[];
}

// ==================== 体能报告相关 ====================

/** 报告周期 */
export interface ReportPeriod {
  /** 开始时间 */
  start: string;
  /** 结束时间 */
  end: string;
}

/** 报告摘要 */
export interface ReportSummary {
  /** 总行程数 */
  totalTrips: number;
  /** 平均疲劳指数 */
  avgFatigueIndex: number;
  /** 平均体感评分 */
  avgEffortRating: number;
  /** 完成率 */
  completionRate: number;
}

/** 体能变化 */
export interface CapabilityChanges {
  /** 起始最大日爬升 */
  startMaxDailyAscentM: number;
  /** 结束最大日爬升 */
  endMaxDailyAscentM: number;
  /** 变化百分比 */
  changePercent: number;
  /** 校准次数 */
  calibrationCount: number;
}

/** 完整体能报告 */
export interface FitnessReport {
  /** 生成时间 */
  generatedAt: string;
  /** 报告周期 */
  period: ReportPeriod;
  /** 摘要数据 */
  summary: ReportSummary;
  /** 趋势分析 */
  trend: FitnessTrend;
  /** 异常检测 */
  anomalies: AnomalyDetectionResult;
  /** 体能变化 */
  capabilityChanges: CapabilityChanges;
  /** 英文建议 */
  recommendations: string[];
  /** 中文建议 */
  recommendationsZh: string[];
}

// ==================== 时间线相关 ====================

/** 时间线事件类型 */
export type TimelineEventType = 
  | 'TRIP_FEEDBACK'   // 行程反馈提交
  | 'CALIBRATION'     // 体能校准
  | 'QUESTIONNAIRE';  // 问卷提交

/** 时间线事件 */
export interface TimelineEvent {
  /** 事件时间 */
  date: string;
  /** 事件类型 */
  event: TimelineEventType;
  /** 事件详情 */
  details: Record<string, unknown>;
}

/** 时间线事件类型配置 */
export interface TimelineEventConfig {
  /** 事件类型 */
  type: TimelineEventType;
  /** 显示标签 */
  label: string;
  /** 图标 */
  icon: string;
  /** 颜色类名 */
  colorClass: string;
}

// ==================== A/B 测试相关 ====================

/** 实验状态 */
export type ExperimentStatus = 
  | 'DRAFT'      // 草稿
  | 'RUNNING'    // 运行中
  | 'PAUSED'     // 已暂停
  | 'COMPLETED'; // 已完成

/** 实验结果状态 */
export type ExperimentResultStatus = 
  | 'INSUFFICIENT_DATA'  // 样本量不足
  | 'IN_PROGRESS'        // 进行中
  | 'SIGNIFICANT'        // 结果显著
  | 'NOT_SIGNIFICANT';   // 结果不显著

/** 实验配置 */
export interface Experiment {
  /** 实验ID */
  id: string;
  /** 实验名称 */
  name: string;
  /** 实验描述 */
  description: string;
  /** 实验状态 */
  status: ExperimentStatus;
  /** 流量占比 */
  trafficPercent: number;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate?: string;
}

/** 实验组数据 */
export interface ExperimentGroupData {
  /** 样本量 */
  sampleSize: number;
  /** 完成率 */
  completionRate: number;
  /** 平均体感评分 */
  avgEffortRating: number;
}

/** 实验结果 */
export interface ExperimentResult {
  /** 实验ID */
  experimentId: string;
  /** 结果状态 */
  status: ExperimentResultStatus;
  /** 对照组数据 */
  control: ExperimentGroupData;
  /** 实验组数据 */
  treatment: ExperimentGroupData;
  /** P值 */
  pValue: number;
  /** 提升百分比 */
  lift: number;
  /** 英文建议 */
  recommendation: string;
  /** 中文建议 */
  recommendationZh: string;
}

// ==================== 校准管理相关 ====================

/** 校准统计 */
export interface CalibrationStats {
  /** 总校准次数 */
  totalCalibrations: number;
  /** 平均校准因子 */
  avgCalibrationFactor: number;
  /** 已校准用户数 */
  usersCalibrated: number;
  /** 上次运行时间 */
  lastRunAt: string;
  /** 下次计划时间 */
  nextScheduledAt: string;
}

/** 校准原因 */
export type CalibrationReason = 
  | 'FEEDBACK_ACCUMULATED'  // 反馈累积
  | 'SCHEDULED'             // 定时校准
  | 'MANUAL'                // 手动触发
  | 'ANOMALY_DETECTED';     // 检测到异常

/** 单个用户校准结果 */
export interface UserCalibrationResult {
  /** 用户ID */
  userId: string;
  /** 是否成功 */
  success: boolean;
  /** 校准原因 */
  reason: CalibrationReason;
  /** 旧模型数据 */
  oldModel: {
    maxDailyAscentM: number;
    rollingAscent3DaysM: number;
  };
  /** 新模型数据 */
  newModel: {
    maxDailyAscentM: number;
    rollingAscent3DaysM: number;
  };
  /** 校准因子 */
  calibrationFactor: number;
  /** 处理的反馈数量 */
  feedbacksProcessed: number;
  /** 新置信度等级 */
  newConfidenceLevel: string;
  /** 校准时间 */
  calibratedAt: string;
}

// ==================== 可穿戴设备相关 ====================

/** 可穿戴设备提供商 */
export type WearableProvider = 
  | 'STRAVA'
  | 'GARMIN'
  | 'APPLE_HEALTH'
  | 'GOOGLE_FIT';

/** 设备连接状态 */
export interface WearableConnection {
  /** 提供商 */
  provider: WearableProvider;
  /** 是否已连接 */
  connected: boolean;
  /** 上次同步时间 */
  lastSyncAt: string | null;
}

/** 活动类型 */
export type WearableActivityType = 
  | 'HIKE'
  | 'WALK'
  | 'RUN'
  | 'RIDE'
  | 'OTHER';

/** 可穿戴设备活动数据 */
export interface WearableActivity {
  /** 活动ID */
  id: string;
  /** 数据来源 */
  provider: WearableProvider;
  /** 活动名称 */
  name: string;
  /** 活动类型 */
  type: WearableActivityType;
  /** 开始时间 */
  startDate: string;
  /** 距离（米） */
  distanceM: number;
  /** 爬升（米） */
  elevationGainM: number;
  /** 移动时间（秒） */
  movingTimeSeconds: number;
  /** 平均心率 */
  avgHeartRate?: number;
}

/** 基于可穿戴数据的体能评估 */
export interface WearableEstimate {
  /** 数据来源 */
  provider: WearableProvider;
  /** 评估时间 */
  estimatedAt: string;
  /** 估算最大日爬升 */
  estimatedMaxDailyAscentM: number;
  /** 估算3日累计爬升 */
  estimatedRollingAscent3DaysM: number;
  /** 置信度评分 */
  confidenceScore: number;
  /** 活动数量 */
  activityCount: number;
  /** 数据范围（天） */
  dataRangeDays: number;
  /** 峰值表现 */
  peakPerformance: {
    /** 单日最大爬升 */
    maxSingleDayAscentM: number;
    /** 单日最大距离 */
    maxSingleDayDistanceKm: number;
    /** 最长移动时间 */
    longestMovingTimeHours: number;
  };
}

/** Strava 授权响应 */
export interface StravaAuthResponse {
  /** 授权 URL */
  authUrl: string;
}

/** 同步请求参数 */
export interface SyncRequestParams {
  /** 开始日期 */
  after?: string;
  /** 结束日期 */
  before?: string;
  /** 数量限制 */
  limit?: number;
}

// ==================== 配置常量 ====================

/** 趋势类型配置映射 */
export const TREND_TYPE_CONFIG: Record<TrendType, TrendConfig> = {
  IMPROVING: {
    type: 'IMPROVING',
    label: '体能正在提升',
    icon: '↗️',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-50',
  },
  STABLE: {
    type: 'STABLE',
    label: '体能保持稳定',
    icon: '➡️',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-50',
  },
  DECLINING: {
    type: 'DECLINING',
    label: '体能有所下降',
    icon: '↘️',
    colorClass: 'text-orange-600',
    bgColorClass: 'bg-orange-50',
  },
  INSUFFICIENT_DATA: {
    type: 'INSUFFICIENT_DATA',
    label: '数据不足',
    icon: '❓',
    colorClass: 'text-gray-500',
    bgColorClass: 'bg-gray-50',
  },
};

/** 异常类型配置映射 */
export const ANOMALY_TYPE_CONFIG: Record<AnomalyType, AnomalyTypeConfig> = {
  SUDDEN_DECLINE: {
    type: 'SUDDEN_DECLINE',
    label: '体能突然下降',
    icon: '⚠️',
    suggestions: [
      '适当降低行程强度',
      '增加休息时间',
      '检查是否身体不适',
    ],
  },
  CONSISTENT_OVERLOAD: {
    type: 'CONSISTENT_OVERLOAD',
    label: '持续超负荷',
    icon: '🔥',
    suggestions: [
      '选择更轻松的路线',
      '增加行程间的休息天数',
      '考虑分段完成长距离行程',
    ],
  },
  RATING_INCONSISTENCY: {
    type: 'RATING_INCONSISTENCY',
    label: '评分不一致',
    icon: '🤔',
    suggestions: [
      '回顾最近的行程体验',
      '考虑是否有外部因素影响',
    ],
  },
  UNUSUAL_PATTERN: {
    type: 'UNUSUAL_PATTERN',
    label: '异常模式',
    icon: '❗',
    suggestions: [
      '查看详细数据分析',
      '如有疑问请联系支持',
    ],
  },
};

/** 时间线事件类型配置 */
export const TIMELINE_EVENT_CONFIG: Record<TimelineEventType, TimelineEventConfig> = {
  TRIP_FEEDBACK: {
    type: 'TRIP_FEEDBACK',
    label: '行程反馈',
    icon: '📝',
    colorClass: 'text-blue-600',
  },
  CALIBRATION: {
    type: 'CALIBRATION',
    label: '体能校准',
    icon: '🎯',
    colorClass: 'text-green-600',
  },
  QUESTIONNAIRE: {
    type: 'QUESTIONNAIRE',
    label: '问卷提交',
    icon: '📋',
    colorClass: 'text-purple-600',
  },
};

/** 可穿戴设备提供商配置 */
export const WEARABLE_PROVIDER_CONFIG: Record<WearableProvider, {
  name: string;
  icon: string;
  color: string;
  available: boolean;
}> = {
  STRAVA: {
    name: 'Strava',
    icon: '🏃',
    color: 'orange',
    available: true,
  },
  GARMIN: {
    name: 'Garmin Connect',
    icon: '⌚',
    color: 'blue',
    available: false, // 即将推出
  },
  APPLE_HEALTH: {
    name: 'Apple 健康',
    icon: '🍎',
    color: 'red',
    available: false,
  },
  GOOGLE_FIT: {
    name: 'Google Fit',
    icon: '💚',
    color: 'green',
    available: false,
  },
};

/** 异常严重度配置 */
export const ANOMALY_SEVERITY_CONFIG: Record<AnomalySeverity, {
  label: string;
  colorClass: string;
  bgColorClass: string;
  borderClass: string;
}> = {
  HIGH: {
    label: '严重',
    colorClass: 'text-red-700',
    bgColorClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
  MEDIUM: {
    label: '中等',
    colorClass: 'text-orange-700',
    bgColorClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
  },
  LOW: {
    label: '轻微',
    colorClass: 'text-yellow-700',
    bgColorClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
  },
};
