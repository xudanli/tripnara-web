/**
 * Reputation OS API 契约类型
 * @see Decision OS · Reputation OS 前端集成指南 v2.0.0 (P2)
 */

export type StarRating = 1 | 2 | 3 | 4 | 5;

/** GET /api/reputation-os/survey/questions */
export type ReputationSurveyQuestion = {
  id: string;
  order: number;
  text: string;
  mapsTo: string;
};

export type ReputationSurveyQuestionsResponse = {
  questions: ReputationSurveyQuestion[];
};

export type CompanionToRate = {
  userId: string;
  displayName: string;
  cardTitle: string | null;
  alreadyRated: boolean;
};

/** GET /api/reputation-os/pending-surveys */
export type PendingSurveyCampaign = {
  id: string;
  postId: string;
  destinationLabel: string | null;
  tripEndDate: string;
  pushCopy: {
    title: string;
    modalPriority: 'global_top';
  };
  companionsToRate: CompanionToRate[];
  isComplete: boolean;
};

export type PendingSurveysResponse = {
  campaigns: PendingSurveyCampaign[];
};

/** GET /api/reputation-os/profile/me · GET .../users/:id/profile */
export type UserReputationAssets = {
  userId: string;
  averageStars: number | null;
  surveyCount: number;
  tagCloud: string[];
  safetyWarning?: string | null;
  updatedAt: string | null;
};

/** POST /api/reputation-os/surveys/submit */
export type SubmitSurveyBody = {
  campaignId: string;
  revieweeUserId: string;
  q1Overall: StarRating;
  q2PaceSync: StarRating;
  q3Communication: StarRating;
  q4Spending: StarRating;
  q5WouldAgain: StarRating;
};

/** GET /api/reputation-os/users/:id/safety */
export type UserSafetyProfile = {
  userId: string;
  safetyWarning: string | null;
};

/** 题干 id → SubmitSurveyBody 字段映射 */
export const SURVEY_FIELD_BY_QUESTION_ID: Record<string, keyof SubmitSurveyBody> = {
  q1_overall: 'q1Overall',
  q2_pace_sync: 'q2PaceSync',
  q3_communication: 'q3Communication',
  q4_spending: 'q4Spending',
  q5_would_again: 'q5WouldAgain',
};

export const FALLBACK_SURVEY_QUESTIONS: ReputationSurveyQuestion[] = [
  { id: 'q1_overall', order: 1, text: '总体而言，你对这次同行的体验打几分？', mapsTo: 'q1Overall' },
  { id: 'q2_pace_sync', order: 2, text: '旅行节奏（暴走/松弛/作息）有多同步？', mapsTo: 'q2PaceSync' },
  { id: 'q3_communication', order: 3, text: '出现分歧时，沟通顺畅吗？', mapsTo: 'q3Communication' },
  { id: 'q4_spending', order: 4, text: '行中花费默契程度如何？', mapsTo: 'q4Spending' },
  { id: 'q5_would_again', order: 5, text: '下次还愿意和这个人组队吗？', mapsTo: 'q5WouldAgain' },
];
