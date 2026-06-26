/**
 * 体验兑现系统 — 前端 API 封装
 * 聚合规划期与行中接口，便于页面统一引用。
 */

import apiClient from './client';
import { inTripExperienceApi } from './in-trip-experience';
import { quickPlanApi } from './quick-plan';
import { tripsApi } from './trips';
import type {
  ExperienceTagMatchOption,
  ExperienceExplanationCard,
  ItineraryPresentationBundle,
  TravelUnderstandingCard,
} from '@/types/experience-fulfillment';
import type { CreateTripFromNLResponse, GenerateTripDraftRequest, TripDraftResponse } from '@/types/trip';
import type { QuickPlanRequest, QuickPlanResponse } from '@/types/quick-plan';

export type {
  ExperienceTagMatchOption,
  ExperienceExplanationCard,
  ItineraryPresentationBundle,
  TravelUnderstandingCard,
};

export { parseWhyRecommended, hasSummaryCard } from '@/lib/parse-planner-blocks.util';

export const experienceFulfillmentApi = {
  /** POST /trips/from-natural-language */
  nlChat: (body: { text: string; sessionId?: string; isNewConversation?: boolean }) =>
    tripsApi.createFromNL(body),

  /** POST /trips/from-natural-language/v2 */
  nlChatV2: (body: { text: string; sessionId?: string; isNewConversation?: boolean }) =>
    tripsApi.createFromNLv2(body),

  /** GET /trips/nl-conversation/:sessionId */
  getNlConversation: (sessionId: string) => tripsApi.getNLConversation(sessionId),

  /** POST /trips/nl-conversation/:sessionId/confirm-create */
  confirmCreate: (
    sessionId: string,
    additionalParams?: Record<string, unknown>,
  ): Promise<CreateTripFromNLResponse> =>
    tripsApi.confirmCreateTrip(sessionId, {
      confirm: true,
      ...(additionalParams ? { additionalParams } : {}),
    }),

  /** POST /trips/draft */
  generateDraft: (dto: GenerateTripDraftRequest): Promise<TripDraftResponse> =>
    tripsApi.generateDraft(dto),

  /** POST /agent/quick-plan */
  quickPlan: (request: QuickPlanRequest): Promise<QuickPlanResponse> =>
    quickPlanApi.quickPlan(request),

  /** POST /agent/quick-plan/confirm */
  quickPlanConfirm: quickPlanApi.confirmPlan,

  /** GET /trips/:tripId/in-trip/experience/tag-match-options */
  getTagMatchOptions: (tripId: string): Promise<ExperienceTagMatchOption[]> =>
    inTripExperienceApi.getTagMatchOptions(tripId),

  submitPulse: inTripExperienceApi.submitPulse,
  getPostTripSummary: inTripExperienceApi.getPostTripSummary,
};
