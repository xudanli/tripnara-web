import type { ThermometerLevel } from '@/types/in-trip-execution';
import type {
  ExperienceFulfillmentReview,
  ExperienceTagMatchOption,
} from '@/types/experience-fulfillment';

export type { ExperienceFulfillmentReview, ExperienceTagMatchOption };

export type ExperienceTriggerType =
  | 'post_activity'
  | 'post_decision'
  | 'daily_review'
  | 'split_party'
  | 'last_day';

/** 1–5 Likert scale used in pulse surveys */
export type ExperiencePulseScore = 1 | 2 | 3 | 4 | 5;

export interface ExperiencePulseTrigger {
  triggerType: ExperienceTriggerType;
  triggerKey: string;
  title: string;
  prompt: string;
  priority: number;
}

export interface ExperiencePulseInput {
  triggerType: ExperienceTriggerType;
  activityName?: string;
  expectationConfirmation?: ExperiencePulseScore;
  emotionalValueScore?: ExperiencePulseScore;
  senseOfControl?: ExperiencePulseScore;
  spendWorthIt?: ExperiencePulseScore;
  teamAtmosphere?: ExperiencePulseScore;
  /** 体验标签匹配（PRD §14 — 来自 tag-match-options） */
  experienceTagMatch?: string;
  freeText?: string;
}

export interface ExperiencePulseSummary {
  id: string;
  tripId: string;
  memberId: string;
  triggerType: ExperienceTriggerType;
  triggerKey?: string;
  activityName?: string | null;
  expectationConfirmation?: ExperiencePulseScore | null;
  emotionalValueScore?: ExperiencePulseScore | null;
  senseOfControl?: ExperiencePulseScore | null;
  spendWorthIt?: ExperiencePulseScore | null;
  teamAtmosphere?: ExperiencePulseScore | null;
  freeText?: string | null;
  /** Auto-computed from score fields, range -1..+1 */
  emotionPolarity: number;
  createdAt: string;
}

export interface ExperiencePulseListResult {
  items: ExperiencePulseSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface InTripRecommendationWeightPatch {
  activityIntensityDelta?: number;
  diningQualityDelta?: number;
  museumDensityDelta?: number;
  bufferDayInserted?: boolean;
  explanationZh?: string;
  appliedAt?: string;
}

export interface InTripRecommendationWeightsCurrent extends InTripRecommendationWeightPatch {
  appliedAt: string;
}

export interface WeightAdjustmentHistoryEntry {
  appliedAt: string;
  patch: InTripRecommendationWeightPatch;
  unread: boolean;
}

export interface WeightAdjustmentsResult {
  current: InTripRecommendationWeightsCurrent | null;
  history: WeightAdjustmentHistoryEntry[];
}

export interface ExperienceHighlight {
  activityName: string;
  emotionalValueScore: number;
  memberId: string;
  quote: string;
}

export interface PostTripSpendingReview {
  totalSpentCny: number;
  budgetTotal: number;
  usagePercent: number;
  topCategory: string;
  currency: string;
}

export interface PostTripTeamLevelTrend {
  dayNumber: number;
  level: ThermometerLevel;
  score: number;
}

export interface PostTripTeamReview {
  averageScore: number;
  levelTrend: PostTripTeamLevelTrend[];
}

export interface PostTripProfileCalibration {
  userId: string;
  calibrated: boolean;
  dominantPersona: string;
  note: string;
}

export interface PostTripSummary {
  tripId: string;
  generatedAt: string;
  experienceHighlights: ExperienceHighlight[];
  spendingReview: PostTripSpendingReview;
  teamReview: PostTripTeamReview;
  profileCalibrations: PostTripProfileCalibration[];
  experienceFulfillmentReview?: ExperienceFulfillmentReview;
}
