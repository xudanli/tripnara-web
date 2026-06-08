/**
 * Odyssey Intake — 旅行人格画像（独立域模型）
 * 与 implicit-feature-vector（AI 路线规划 12 维向量）分离存储。
 * @see Decision OS PRD v1.0.0 — Odyssey Intake
 */

/** MBTI 四字母类型 */
export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFP' | 'INFJ' | 'ENFP' | 'ENFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ';

/** MBTI 象限分组 */
export type MbtiQuadrant = 'NT' | 'NF' | 'SP' | 'SJ';

/** 答题选项 ID */
export type OdysseyAnswerChoice = 'A' | 'B' | 'C';

/** 旧版 5 道情景题 ID（retake 兼容） */
export type OdysseyQuestionId =
  | 'budget_tolerance'
  | 'ambiguity_tolerance'
  | 'energy_pace'
  | 'social_preference'
  | 'aesthetic_meaning';

/** Premium v2 · 行中博弈抗压题 ID（来自 GET /premium-stress-test/questions） */
export type PremiumStressQuestionId = string;

export type PremiumStressAnswerChoice = 'A' | 'B';

/** 认知风格原始分值（答题累加，非归一化） */
export interface OdysseyCognitiveScores {
  financial_flexibility: number;
  planning_index: number;
  compromise_index: number;
  ambiguity_tolerance: number;
  stress_anxiety_index: number;
  energy_capacity: number;
  travel_pace_specialist: number;
  travel_pace_relaxed: number;
  social_drive: number;
  aesthetic_meaning: number;
  aesthetic_sensory: number;
  mbti_e_score: number;
  mbti_i_score: number;
  mbti_t_score: number;
  mbti_f_score: number;
  mbti_s_score: number;
  mbti_n_score: number;
  mbti_j_score: number;
  mbti_p_score: number;
}

/** MBTI 四轴百分比 0–100 */
export interface MbtiAxisPercentages {
  E: number;
  I: number;
  S: number;
  N: number;
  T: number;
  F: number;
  J: number;
  P: number;
}

/** 雷达图展示维度（0–100 归一化） */
export interface TravelPersonaRadarDimensions {
  financialFlexibility: number;
  planningRigidity: number;
  ambiguityTolerance: number;
  energyCapacity: number;
  socialDrive: number;
  meaningOrientation: number;
}

/** 解析后的旅行人格 */
export interface ResolvedTravelPersona {
  mbtiType: MbtiType;
  quadrant: MbtiQuadrant;
  title: string;
  description: string;
  radar: TravelPersonaRadarDimensions;
  axisPercentages: MbtiAxisPercentages;
}

/** 本次出行即时状态标签（不改变底层人格） */
export type TripIntentTag =
  | 'open_to_match'
  | 'solo_focus'
  | 'budget_mode'
  | 'luxury_splurge'
  | 'slow_travel'
  | 'intensive_pace';

export const TRIP_INTENT_TAG_LABELS: Record<TripIntentTag, string> = {
  open_to_match: '开放匹配',
  solo_focus: '独行专注',
  budget_mode: '穷游模式',
  luxury_splurge: '品质优先',
  slow_travel: '慢旅行',
  intensive_pace: '特种兵节奏',
};

/** 用户旅行人格完整画像 */
export interface OdysseyTravelPersonaProfile {
  userId?: string;
  completedAt: string;
  answers: Partial<Record<OdysseyQuestionId, OdysseyAnswerChoice>>;
  cognitiveScores: OdysseyCognitiveScores;
  persona: ResolvedTravelPersona;
  tripIntentTag: TripIntentTag;
  /** 行后互评修正后触发流光刷新 */
  recentlyUpdated?: boolean;
  updatedReason?: string;
}

/** 测评提交载荷 */
export interface OdysseyIntakeSubmitPayload {
  answers: Record<OdysseyQuestionId, OdysseyAnswerChoice>;
  tripIntentTag?: TripIntentTag;
}

/** Premium v2 入网提交载荷 */
export interface PremiumIntakeSubmitPayload {
  mbtiType: MbtiType;
  stressAnswers: Record<PremiumStressQuestionId, PremiumStressAnswerChoice>;
  intakeVersion: 'premium_v2';
  tripIntentTag?: TripIntentTag;
}

/** 推荐搭子候选（撮合引擎输出） */
export interface OdysseyMatchCandidate {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  mbtiType: MbtiType;
  personaTitle: string;
  compatibilityScore: number;
  destination?: string;
  dateRange?: string;
  highlights: string[];
}
