/**
 * 体验兑现系统 — 规划期 / 行中共享类型
 * @see 体验兑现系统前端对接接口文档
 */

/** PRD §8.2 体验原子编码 */
export type ExperienceAtomCode =
  | 'EPIC_WATERFALL'
  | 'REMOTE_WORLD_EDGE'
  | 'CINEMATIC_PHOTOGRAPHY'
  | 'HEALING_HOT_SPRING'
  | 'WILD_COAST_SOLITUDE'
  | 'GLACIER_ADVENTURE'
  | 'LOW_EFFORT_NATURE'
  | 'SLOW_TRAVEL_RELAXATION';

export type ExperienceIntentPriority = 'MUST_PRESERVE' | 'HIGH' | 'NORMAL';

export type NegativePreferenceType =
  | 'HIGH_CROWD'
  | 'HIGH_PHYSICAL_EFFORT'
  | 'LONG_DRIVE'
  | string;

export interface ExperienceIntentAtom {
  atom: ExperienceAtomCode;
  weight: number;
  priority?: ExperienceIntentPriority;
  participants?: string[];
}

export interface NegativePreference {
  type: NegativePreferenceType;
  weight: number;
}

export interface ExperienceIntent {
  revision: 'v1';
  experienceIntents: ExperienceIntentAtom[];
  negativePreferences: NegativePreference[];
  confidence?: number;
  source?: 'rule' | 'llm' | 'hybrid';
}

/** PRD §9.2 旅行理解卡 */
export interface TravelUnderstandingCard {
  revision: 'v1';
  travelGoals: string[];
  memberConditions: string[];
  coreConstraints: string[];
  systemAssumptions: string[];
  experienceIntent: ExperienceIntent;
}

/** PRD §13.5 四级确定性 */
export type UserCertaintyLevel =
  | 'EXCELLENT_CONDITIONS'
  | 'SUITABLE'
  | 'UNCERTAIN'
  | 'NOT_RECOMMENDED';

export interface ExperienceExplanationDimension {
  level: UserCertaintyLevel;
  labelZh: string;
  detail: string;
  factors?: string[];
}

/** PRD §13.2 / §13.5 体验解释卡 */
export interface ExperienceExplanationCard {
  revision: 'v1';
  overallLevel: UserCertaintyLevel;
  overallLabelZh: string;
  overallSummary: string;
  dimensions: {
    routeFeasibility: ExperienceExplanationDimension;
    experienceMatch: ExperienceExplanationDimension;
    changingFactors: ExperienceExplanationDimension;
  };
  whyRecommended: string[];
  risks: string[];
  planBHints: string[];
}

export type LoadLevel = 'light' | 'moderate' | 'heavy';

export type PresentedItineraryItemBadge =
  | 'VERIFIED'
  | 'WEATHER_SENSITIVE'
  | 'LOW_PHYSICAL'
  | 'HAS_ALTERNATIVE'
  | 'CORE_EXPERIENCE';

export interface PresentedItineraryItem {
  placeId: number;
  slot: string;
  startTime: string;
  endTime: string;
  badges: PresentedItineraryItemBadge[];
  inspiration: {
    placeName: string;
    poeticLine: string;
    experienceTags: string[];
  };
  credible: {
    driveHint?: string;
    walkHint?: string;
    vehicleHint?: string;
    weatherHint?: string;
    openingHours?: string;
    visitDuration?: string;
  };
  certaintyLabel?: string;
}

export interface PresentedItineraryDay {
  day: number;
  date: string;
  theme: string;
  driveLoad: LoadLevel;
  walkLoad: LoadLevel;
  budgetHint?: string;
  coreExperience: string;
  certaintyLevel: UserCertaintyLevel;
  certaintyLabel: string;
  certaintySummary: string;
  items: PresentedItineraryItem[];
}

/** PRD §13.3 日程展示层 */
export interface ItineraryPresentationBundle {
  revision: 'v1';
  days: PresentedItineraryDay[];
  overallCertaintyLevel: UserCertaintyLevel;
  overallCertaintyLabel: string;
  overallSummary: string;
}

/** plannerResponseBlocks — why_recommended 块 */
export interface WhyRecommendedBlock {
  type: 'why_recommended';
  title?: string;
  bullets: string[];
  overallLabel?: string;
  overallSummary?: string;
  dimensions?: {
    routeFeasibility?: string;
    experienceMatch?: string;
    changingFactors?: string[] | string;
  };
}

/** 行中微调查 — 体验标签匹配选项 */
export interface ExperienceTagMatchOption {
  value: string;
  labelZh: string;
  mapsToAtom?: ExperienceAtomCode;
}

/** 行后总结 — 体验兑现回顾 */
export interface ExperienceFulfillmentReview {
  plannedIntents: string[];
  outcomeCount: number;
  alignedCount: number;
  alignmentRate: number;
  topMatchedTags: Array<{ tag: string; count: number }>;
  summaryZh: string;
}
