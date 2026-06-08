import type { PlanningStyle } from '@/types/match-square';
import type { MbtiType } from '@/types/odyssey-travel-persona';
import type {
  PremiumStressAnswerChoice,
  PremiumStressQuestionId,
} from '@/types/odyssey-travel-persona';

/** 组队契约三档（与 PlanningStyle 对齐，含队员「甩手掌柜」语义） */
export type ControlStyleBand = 'full_managed' | 'co_planning' | 'casual_delegate';

export type MatchTripWindow = {
  destination: string;
  startDate: string;
  endDate: string;
};

/** 用户特征向量 U = [M₁₋₄, E₁₋₂, P₁₋₂, C, A, F] */
export type MatchEngineProfile = {
  userId?: string;
  mbtiType: MbtiType | string;
  /** MBTI 四轴 0/1：E, S, T, J */
  mbtiAxis: [number, number, number, number];
  credentials: {
    e1: number;
    e2: number;
    p1: number;
    p2: number;
  };
  /** E₁ × E₂ × P₂ — 圈层沟通带宽 */
  socialScore: number;
  socialTier: number;
  stressTraits: {
    /** C — 控制欲与主导倾向 1–10 */
    controlScore: number;
    /** A — 品质底线 1–10 */
    qualityBaseline: number;
    /** F — 财务弹性与悦己独立 1–10 */
    financialElasticity: number;
  };
  controlStyle: ControlStyleBand;
  /** 发帖队长声明的组队风格（仅 leader 有） */
  declaredPlanningStyle?: PlanningStyle | null;
  trip?: MatchTripWindow | null;
  /** Premium v2 原始抗压题（可选） */
  stressAnswers?: Partial<Record<PremiumStressQuestionId, PremiumStressAnswerChoice>>;
};

export type StructuralMatchInsightLevel = 'pass' | 'warn' | 'fail';

export type StructuralMatchInsight = {
  level: StructuralMatchInsightLevel;
  label: string;
  detail: string;
};

/** 双层撮合输出 — 团队结构稳定性报告 */
export type StructuralMatchResult = {
  score: number;
  blocked: boolean;
  blockReason?: string;
  /** Layer 1 */
  timeOverlapDays: number | null;
  socialBandwidthGap: number;
  /** Layer 2 分量 */
  teamworkFit: number;
  stressFit: number;
  mbtiSynergy: number;
  insights: StructuralMatchInsight[];
};

export type CalculateStructuralMatchOptions = {
  /** 队员当前意向行程（自由人刷新广场时） */
  memberTrip?: MatchTripWindow | null;
  /** 跳过时空熔断（意向未设置时） */
  skipTimeGate?: boolean;
  minOverlapDays?: number;
  maxSocialTierGap?: number;
};
