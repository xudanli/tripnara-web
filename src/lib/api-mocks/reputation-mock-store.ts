import type {
  PendingSurveysResponse,
  ReputationSurveyQuestionsResponse,
  SubmitSurveyBody,
  UserReputationAssets,
  UserSafetyProfile,
} from '@/types/reputation';
import { FALLBACK_SURVEY_QUESTIONS } from '@/types/reputation';

const MOCK_CAMPAIGN_ID = 'campaign-mock-1';

const MOCK_REPUTATION: UserReputationAssets = {
  userId: 'current-user',
  averageStars: 4.9,
  surveyCount: 12,
  tagCloud: ['极度守时', '消费观合拍', '神仙旅伴'],
  safetyWarning: null,
  updatedAt: '2026-07-13T08:00:00.000Z',
};

let ratedReviewees = new Set<string>();

function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const reputationMockStore = {
  getPendingSurveys: (): Promise<PendingSurveysResponse> => {
    const companionsToRate = [
      {
        userId: 'captain-1',
        displayName: 'Danny',
        cardTitle: '规划型探索者',
        alreadyRated: ratedReviewees.has('captain-1'),
      },
      {
        userId: 'user-wxy',
        displayName: '王小野',
        cardTitle: '随性体验者',
        alreadyRated: ratedReviewees.has('user-wxy'),
      },
    ];
    const isComplete = companionsToRate.every((c) => c.alreadyRated);
    return delay({
      campaigns: isComplete
        ? []
        : [
            {
              id: MOCK_CAMPAIGN_ID,
              postId: 'rec-1',
              destinationLabel: '西北 · 青甘环线',
              tripEndDate: '2026-06-04',
              pushCopy: {
                title: '旅行已结束，给你的旅伴打个分吧',
                modalPriority: 'global_top',
              },
              companionsToRate,
              isComplete,
            },
          ],
    });
  },

  getSurveyQuestions: (): Promise<ReputationSurveyQuestionsResponse> =>
    delay({ questions: FALLBACK_SURVEY_QUESTIONS }),

  submitSurvey: (payload: SubmitSurveyBody): Promise<void> => {
    ratedReviewees.add(payload.revieweeUserId);
    return delay(undefined);
  },

  getProfileMe: (): Promise<UserReputationAssets> => delay(MOCK_REPUTATION),

  getUserProfile: (userId: string): Promise<UserReputationAssets> =>
    delay({
      ...MOCK_REPUTATION,
      userId,
      safetyWarning: undefined,
    }),

  getUserSafety: (userId: string): Promise<UserSafetyProfile> =>
    delay({
      userId,
      safetyWarning:
        userId === 'user-risky'
          ? '该用户历史存在放鸽子/计划执行度极低记录，审批前请谨慎确认'
          : null,
    }),
};

/** 供 match-square mock 读取信誉星级 */
export function getMockAverageStars(): number {
  return MOCK_REPUTATION.averageStars ?? 4.9;
}
