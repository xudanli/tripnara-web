import type { InteractionMode, PlanningStyle, TripMoodTag } from '@/types/match-square';
import type { MbtiQuadrant } from '@/types/odyssey-travel-persona';

export const INTERACTION_MODE_LABELS: Record<InteractionMode, string> = {
  deep_learning: '深度共学型',
  easy_companion: '轻松陪伴型',
  independent: '各自独立型',
};

export const TRIP_MOOD_LABELS: Record<TripMoodTag, string> = {
  relax: '放松',
  adventure: '冒险',
  healing: '疗愈',
  social: '社交',
};

export const TRAVEL_MODE_LABELS = {
  self_drive: '自驾',
  public_transit: '公共交通',
  mixed: '混合出行',
  other: '其他',
} as const;

export const PLANNING_STYLE_LABELS: Record<PlanningStyle, string> = {
  full_managed: '全托管',
  co_planning: '一起策划',
  casual_play: '一起随便玩',
};

export const PLANNING_STYLE_CAPSULES: Record<PlanningStyle, string> = {
  full_managed: '🛡️ 组队风格：全托管',
  co_planning: '🛡️ 组队风格：一起策划',
  casual_play: '🛡️ 组队风格：一起随便玩',
};

export const MBTI_QUADRANT_LABELS: Record<MbtiQuadrant, string> = {
  NT: 'NT · 分析型',
  NF: 'NF · 理想型',
  SP: 'SP · 体验型',
  SJ: 'SJ · 守护型',
};

export const RECRUITMENT_STATUS_LABELS = {
  active: '招募中',
  hidden: '已下架',
  closed: '已结束',
  full: '已满员',
} as const;

/** PRD §4.3 申请留言上限 */
export const APPLICATION_MESSAGE_MAX = 200;

/** 行程概述上限（多日程需更长描述；与后端字段长度对齐后同步调整） */
export const ITINERARY_SUMMARY_MAX = 5000;

/** PRD §3.1 缺人数量区间 */
export const SPOTS_NEEDED_MIN = 1;
export const SPOTS_NEEDED_MAX = 6;

export const MATCH_DIMENSION_WEIGHTS = {
  planning: 0.2125,
  socialEnergy: 0.17,
  decisionSpeed: 0.1275,
  riskTolerance: 0.17,
  spending: 0.17,
  /** PRD 3.5.1 — 人格五维合计 85%，圈层 15% 以加成分计入 */
  socialBackground: 0.15,
} as const;

export const MATCH_DIMENSION_LABELS: Record<keyof typeof MATCH_DIMENSION_WEIGHTS, string> = {
  planning: '计划性',
  socialEnergy: '社交能量',
  decisionSpeed: '决策速度',
  riskTolerance: '风险承受',
  spending: '消费观',
  socialBackground: '圈层同频',
};

/** Match Engine v2 契约分量标签 */
export const STRUCTURAL_MATCH_WEIGHTS = {
  teamworkFit: 0.3,
  stressFit: 0.25,
  mbtiSynergy: 0.2,
} as const;
