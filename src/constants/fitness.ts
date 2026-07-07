/**
 * 体能评估相关常量配置
 * @module constants/fitness
 */

import type { 
  HumanCapabilityModel, 
  FitnessProfile, 
  FitnessLevel,
  AgeGroup,
} from '@/types/fitness';

/**
 * 默认体能模型（用户跳过问卷时使用）
 * 策略：使用 MEDIUM_LOW 等级的保守参数，确保行程安全
 */
export const DEFAULT_CAPABILITY_MODEL: HumanCapabilityModel = {
  profileId: 'default',
  maxDailyAscentM: 600,           // 保守值：600m（普通人可接受）
  rollingAscent3DaysM: 1500,      // 3天累计 1500m
  maxSlopePct: 20,                // 最大坡度 20%
  preferredPace: 'MEDIUM',
  riskTolerance: 'MEDIUM',
  highAltitudeExperience: 'NONE',
  maxElevationM: 3000,
  requiresGradualAscent: true,
  bufferDayBias: 'MEDIUM',
  weatherRiskWeight: 0.5,
  // 不设置年龄相关参数，使用默认修正系数 1.0
  fitnessScore: 40,               // 偏保守的评分
  fitnessLevel: 'MEDIUM_LOW',
  assessmentSource: 'DEFAULT',
  confidenceLevel: 'LOW',         // 明确标注低置信度
  completedTripCount: 0,
};

/**
 * 默认体能画像（用于 UI 展示）
 */
export const DEFAULT_FITNESS_PROFILE: FitnessProfile = {
  overallScore: 40,
  fitnessLevel: 'MEDIUM_LOW',
  levelDescription: '使用默认体能参数，完成评估可获得更精准的推荐',
  confidence: 'LOW',
  confidenceDescription: '尚未完成体能评估，建议完成问卷以获得个性化推荐',
  dimensions: {
    climbingAbility: 40,
    endurance: 40,
    recoverySpeed: 50,
  },
  recommendedDailyAscentM: 600,
  recommendedDailyDistanceKm: 15,
  completedTripCount: 0,
};

/**
 * 体能等级配置
 */
export const FITNESS_LEVEL_CONFIG: Record<FitnessLevel, {
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  maxAscent: number;
  maxDistance: number;
  emoji: string;
}> = {
  LOW: {
    label: '入门徒步者',
    labelEn: 'Beginner',
    description: '适合轻松的城市游览和平缓步道',
    descriptionEn: 'Suitable for easy city walks and gentle trails',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-200',
    maxAscent: 400,
    maxDistance: 12,
    emoji: '🌱',
  },
  MEDIUM_LOW: {
    label: '有一定基础',
    labelEn: 'Basic',
    description: '可以尝试中等难度的徒步路线',
    descriptionEn: 'Can try moderate hiking routes',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/15',
    borderColor: 'border-border',
    maxAscent: 600,
    maxDistance: 16,
    emoji: '🚶',
  },
  MEDIUM: {
    label: '经验丰富',
    labelEn: 'Intermediate',
    description: '经验丰富的徒步者，可以挑战大多数路线',
    descriptionEn: 'Experienced hiker, can handle most trails',
    color: 'text-gate-allow-foreground',
    bgColor: 'bg-gate-allow',
    borderColor: 'border-gate-allow-border',
    maxAscent: 800,
    maxDistance: 20,
    emoji: '🏃',
  },
  MEDIUM_HIGH: {
    label: '资深户外爱好者',
    labelEn: 'Advanced',
    description: '具备较强的体能储备，可挑战高难度路线',
    descriptionEn: 'Strong fitness, can tackle challenging routes',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200',
    maxAscent: 1000,
    maxDistance: 24,
    emoji: '💪',
  },
  HIGH: {
    label: '专业级别',
    labelEn: 'Expert',
    description: '可以应对极限挑战和长距离穿越',
    descriptionEn: 'Can handle extreme challenges and long treks',
    color: 'text-gate-reject-foreground',
    bgColor: 'bg-gate-reject',
    borderColor: 'border-gate-reject-border',
    maxAscent: 1200,
    maxDistance: 28,
    emoji: '🏆',
  },
};

/**
 * 置信度配置
 */
export const CONFIDENCE_LEVEL_CONFIG: Record<'LOW' | 'MEDIUM' | 'HIGH', {
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  color: string;
  bgColor: string;
  percentage: number;
}> = {
  LOW: {
    label: '低',
    labelEn: 'Low',
    description: '评估准确度有限，建议完成更多行程',
    descriptionEn: 'Limited accuracy, complete more trips for better assessment',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    percentage: 30,
  },
  MEDIUM: {
    label: '中',
    labelEn: 'Medium',
    description: '评估基本可靠，已有一定数据支撑',
    descriptionEn: 'Reasonably reliable, some data available',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/15',
    percentage: 60,
  },
  HIGH: {
    label: '高',
    labelEn: 'High',
    description: '评估很准确，基于充分的历史数据',
    descriptionEn: 'Very accurate, based on sufficient historical data',
    color: 'text-gate-allow-foreground',
    bgColor: 'bg-gate-allow',
    percentage: 90,
  },
};

/**
 * 年龄修正系数
 */
export const AGE_MODIFIERS: Record<AgeGroup, {
  modifier: number;
  description: string;
  descriptionEn: string;
}> = {
  '18-29': { 
    modifier: 1.0, 
    description: '体能巅峰期',
    descriptionEn: 'Peak fitness',
  },
  '30-39': { 
    modifier: 0.95, 
    description: '体能良好，略有下降',
    descriptionEn: 'Good fitness, slight decline',
  },
  '40-49': { 
    modifier: 0.90, 
    description: '需要适当调整强度',
    descriptionEn: 'May need intensity adjustment',
  },
  '50-59': { 
    modifier: 0.80, 
    description: '建议选择舒适节奏',
    descriptionEn: 'Comfortable pace recommended',
  },
  '60+': { 
    modifier: 0.70, 
    description: '建议轻松休闲路线',
    descriptionEn: 'Easy leisure routes recommended',
  },
};

/**
 * 体力感受配置
 */
export const EFFORT_RATING_CONFIG: Record<1 | 2 | 3, {
  emoji: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  calibrationFactor: number;
}> = {
  1: {
    emoji: '😓',
    label: '太累了',
    labelEn: 'Too tired',
    description: '这次行程强度超出了我的体能范围',
    descriptionEn: 'This trip exceeded my fitness level',
    calibrationFactor: 0.85,
  },
  2: {
    emoji: '😊',
    label: '刚刚好',
    labelEn: 'Just right',
    description: '行程安排很合适，体力分配刚好',
    descriptionEn: 'Trip was well planned, energy well distributed',
    calibrationFactor: 1.0,
  },
  3: {
    emoji: '💪',
    label: '还能再走',
    labelEn: 'Could do more',
    description: '感觉还有余力，可以尝试更有挑战的路线',
    descriptionEn: 'Had energy to spare, could try more challenging routes',
    calibrationFactor: 1.10,
  },
};

/**
 * 行程调整选项配置
 */
export const ADJUSTMENT_OPTIONS = [
  { 
    id: 'skipped_spots' as const, 
    label: '跳过了某些景点',
    labelEn: 'Skipped some attractions',
    emoji: '⏭️',
  },
  { 
    id: 'extended_rest' as const, 
    label: '延长了休息时间',
    labelEn: 'Extended rest time',
    emoji: '☕',
  },
  { 
    id: 'shortened_hike' as const, 
    label: '缩短了徒步距离',
    labelEn: 'Shortened hiking distance',
    emoji: '📏',
  },
  { 
    id: 'changed_transport' as const, 
    label: '改变了交通方式',
    labelEn: 'Changed transportation',
    emoji: '🚗',
  },
  { 
    id: 'other' as const, 
    label: '其他调整',
    labelEn: 'Other adjustments',
    emoji: '📝',
  },
];

/**
 * 问卷配置
 */
export const QUESTIONNAIRE_CONFIG = {
  /** 问卷过期时间（小时） */
  EXPIRY_HOURS: 24,
  /** 问卷总步骤数 */
  TOTAL_STEPS: 4,
  /** 问卷跳过后冷却期（天） */
  SKIP_COOLDOWN_DAYS: 7,
};

/**
 * 评估过期配置
 */
export const ASSESSMENT_CONFIG = {
  /** 评估过期天数（180天 = 6个月） */
  EXPIRY_DAYS: 180,
  /** 提醒用户重新评估的天数 */
  REMINDER_DAYS: 150,
};

/**
 * 近期趋势配置
 */
export const TREND_CONFIG: Record<'improving' | 'stable' | 'declining', {
  label: string;
  labelEn: string;
  emoji: string;
  color: string;
}> = {
  improving: {
    label: '持续提升',
    labelEn: 'Improving',
    emoji: '📈',
    color: 'text-gate-allow-foreground',
  },
  stable: {
    label: '保持稳定',
    labelEn: 'Stable',
    emoji: '➡️',
    color: 'text-muted-foreground',
  },
  declining: {
    label: '有所下降',
    labelEn: 'Declining',
    emoji: '📉',
    color: 'text-amber-600',
  },
};
