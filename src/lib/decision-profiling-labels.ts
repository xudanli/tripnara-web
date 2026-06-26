import type {
  CompatibilityBand,
  ConsumptionPace,
  DecisionStyleType,
  FrictionDomain,
  FrictionLevel,
  SplitMechanismMode,
} from '@/types/trip-decision-profiling';

export const DECISION_STYLE_LABELS: Record<DecisionStyleType, string> = {
  RATIONAL_EXPLORER: '理性探索者',
  EXPERIENCE_SEEKER: '体验追求者',
  HARMONY_COORDINATOR: '和谐协调者',
  SPONTANEOUS_ADVENTURER: '即兴冒险家',
  PRAGMATIC_PLANNER: '务实规划者',
  FLEXIBLE_OPTIMIZER: '灵活优化者',
};

export const FRICTION_DOMAIN_LABELS: Record<FrictionDomain, string> = {
  accommodation: '住宿',
  dining: '餐饮',
  activities: '活动体验',
  transportation: '交通',
  pace: '行程节奏',
  budget: '预算心理',
  planning_style: '规划方式',
  group_decision: '集体决策',
};

export const FRICTION_LEVEL_CLASSES: Record<FrictionLevel, string> = {
  green: 'bg-emerald-500/80',
  yellow: 'bg-amber-400/90',
  red: 'bg-red-500/90',
};

export const FRICTION_LEVEL_TEXT: Record<FrictionLevel, string> = {
  green: '低摩擦',
  yellow: '需关注',
  red: '高风险',
};

export const COMPATIBILITY_BAND_CLASSES: Record<CompatibilityBand, string> = {
  high: 'text-emerald-600',
  needs_negotiation: 'text-amber-600',
  high_risk: 'text-red-600',
};

export const SPLIT_MODE_LABELS: Record<SplitMechanismMode, string> = {
  split_aa: 'AA制（即时了结）',
  rotating_treat: '轮流请客（人情互惠）',
  proportional: '按比例分摊',
  hybrid: '混合模式',
};

export const CONSUMPTION_PACE_LABELS: Record<ConsumptionPace, string> = {
  planned: '提前规划',
  spontaneous: '即兴消费',
  balanced: '平衡型',
};

export const MONEY_DNA_AXIS_LABELS: Record<string, string> = {
  experienceTendency: '体验倾向',
  qualityTendency: '品质倾向',
  timeValueTendency: '时间价值',
  socialScarcityTendency: '社交稀缺性',
};

export function pct(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}
