import apiClient from './client';
import type {
  AttractionExploreAddCandidateRequest,
  AttractionExploreAiConsultRequest,
  AttractionExploreAiConsultResponse,
  AttractionExploreAutoArrangeRequest,
  AttractionExploreAutoArrangeResponse,
  AttractionExploreCandidatesResponse,
  AttractionExploreContextResponse,
  AttractionExploreExploreIntentRequest,
  AttractionExploreExploreIntentResponse,
  AttractionExploreMapPlaceProposalRequest,
  AttractionExploreMapPlaceProposalResponse,
  AttractionExploreMapResponse,
  AttractionExploreRecommendationsResponse,
  AttractionExploreRemoveCandidateRequest,
  AttractionExploreReorderCandidatesRequest,
  AttractionExploreSearchRequest,
  AttractionExploreUpdateContextRequest,
  AttractionExploreViewTab,
} from '@/types/attraction-explore';
import {
  MOCK_ATTRACTION_EXPLORE_CANDIDATES,
  MOCK_ATTRACTION_EXPLORE_CONTEXT,
  MOCK_ATTRACTION_EXPLORE_RECOMMENDATIONS,
} from '@/components/plan-studio/workbench/attraction-explore/mock-attraction-explore.data';
import {
  normalizeAttractionExploreAutoArrange,
  normalizeAttractionExploreCandidates,
  normalizeAttractionExploreContext,
  normalizeAttractionExploreMap,
  normalizeAttractionExploreRecommendations,
  normalizeExploreIntentResponse,
  normalizeMapPlaceProposal,
} from './normalize-attraction-explore';
import { liveRoutesQueryParam } from '@/lib/attraction-explore-route-options.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的 API 响应');
  }
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }
  return response.data.data;
}

/** 仅显式开启时使用 Mock（VITE_ATTRACTION_EXPLORE_MOCK=1） */
const USE_MOCK = import.meta.env.VITE_ATTRACTION_EXPLORE_MOCK === '1';
const INTEGRATION_DEBUG = import.meta.env.DEV && import.meta.env.VITE_ATTRACTION_EXPLORE_DEBUG === '1';

function tripBase(tripId: string): string {
  return `/trips/${tripId}/attraction-explore`;
}

async function withOptionalMock<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  if (USE_MOCK) return fallback;
  return request();
}

function logIntegration(endpoint: string, payload: unknown) {
  if (!INTEGRATION_DEBUG) return;
  console.debug(`[attraction-explore] ${endpoint}`, payload);
}

function buildContextPatchBody(payload: AttractionExploreUpdateContextRequest) {
  const themeIds =
    payload.selectedFilters?.themeIds ??
    payload.selectedThemeIds ??
    [];
  const suitabilityIds =
    payload.selectedFilters?.suitabilityIds ??
    payload.selectedSuitabilityIds ??
    [];
  const viewTab = payload.selectedFilters?.viewTab ?? payload.viewTab;

  return {
    selectedFilters: {
      themeIds,
      suitabilityIds,
      ...(viewTab ? { viewTab } : {}),
    },
  };
}

export const attractionExploreApi = {
  getContext: async (tripId: string): Promise<AttractionExploreContextResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.get<ApiResponseWrapper<unknown>>(
          `${tripBase(tripId)}/context`,
        );
        const data = normalizeAttractionExploreContext(handleResponse(response));
        logIntegration('GET context', data);
        return data;
      },
      MOCK_ATTRACTION_EXPLORE_CONTEXT,
    ),

  updateContext: async (
    tripId: string,
    payload: AttractionExploreUpdateContextRequest,
  ): Promise<AttractionExploreContextResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.patch<ApiResponseWrapper<unknown>>(
          `${tripBase(tripId)}/context`,
          buildContextPatchBody(payload),
        );
        const data = normalizeAttractionExploreContext(handleResponse(response));
        logIntegration('PATCH context', data);
        return data;
      },
      normalizeAttractionExploreContext({
        ...MOCK_ATTRACTION_EXPLORE_CONTEXT,
        selectedThemeIds:
          payload.selectedFilters?.themeIds ??
          payload.selectedThemeIds ??
          MOCK_ATTRACTION_EXPLORE_CONTEXT.selectedThemeIds,
        selectedSuitabilityIds:
          payload.selectedFilters?.suitabilityIds ??
          payload.selectedSuitabilityIds ??
          MOCK_ATTRACTION_EXPLORE_CONTEXT.selectedSuitabilityIds,
        selectedViewTab:
          payload.selectedFilters?.viewTab ?? payload.viewTab ?? MOCK_ATTRACTION_EXPLORE_CONTEXT.selectedViewTab,
      }),
    ),

  getRecommendations: async (input: {
    tripId: string;
    themeIds?: string[];
    suitabilityIds?: string[];
    viewTab?: AttractionExploreViewTab;
    query?: string;
    useLiveRoutes?: boolean;
  }): Promise<AttractionExploreRecommendationsResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.get<ApiResponseWrapper<unknown>>(
          `${tripBase(input.tripId)}/recommendations`,
          {
            params: {
              themeIds: input.themeIds?.join(','),
              suitabilityIds: input.suitabilityIds?.join(','),
              viewTab: input.viewTab,
              q: input.query,
              ...liveRoutesQueryParam(input.useLiveRoutes),
            },
          },
        );
        const data = normalizeAttractionExploreRecommendations(handleResponse(response));
        logIntegration('GET recommendations', { sectionCount: data.sections.length });
        return data;
      },
      MOCK_ATTRACTION_EXPLORE_RECOMMENDATIONS,
    ),

  compileExploreIntent: async (
    payload: AttractionExploreExploreIntentRequest,
  ): Promise<AttractionExploreExploreIntentResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.post<ApiResponseWrapper<unknown>>(
          `${tripBase(payload.tripId)}/explore-intent`,
          { query: payload.query, useLlm: payload.useLlm === true ? true : undefined },
        );
        const data = normalizeExploreIntentResponse(handleResponse(response));
        logIntegration('POST explore-intent', data);
        return data;
      },
      {
        query: payload.query,
        themes: [{ id: 'nature', label: '自然风光' }],
        suitableFor: [{ id: 'elderly', label: '适合老人' }],
        maxDetourMinutes: 30,
        routeContext: '黄金圈',
        source: payload.useLlm ? 'rules+llm' : 'rules',
      },
    ),

  search: async (
    payload: AttractionExploreSearchRequest,
  ): Promise<AttractionExploreRecommendationsResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.post<ApiResponseWrapper<unknown>>(
          `${tripBase(payload.tripId)}/search`,
          payload,
        );
        const data = normalizeAttractionExploreRecommendations(handleResponse(response));
        logIntegration('POST search', { sectionCount: data.sections.length, query: payload.query });
        return data;
      },
      MOCK_ATTRACTION_EXPLORE_RECOMMENDATIONS,
    ),

  getCandidates: async (tripId: string): Promise<AttractionExploreCandidatesResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.get<ApiResponseWrapper<unknown>>(
          `${tripBase(tripId)}/candidates`,
        );
        const data = normalizeAttractionExploreCandidates(handleResponse(response));
        logIntegration('GET candidates', {
          count: data.candidates.length,
          summary: data.summary,
        });
        return data;
      },
      MOCK_ATTRACTION_EXPLORE_CANDIDATES,
    ),

  addCandidate: async (
    payload: AttractionExploreAddCandidateRequest,
  ): Promise<AttractionExploreCandidatesResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.post<ApiResponseWrapper<unknown>>(
          `${tripBase(payload.tripId)}/candidates`,
          {
            placeId: payload.placeId,
            attractionId: payload.attractionId,
            priority: payload.priority,
            useLiveRoutes: payload.useLiveRoutes === true ? true : undefined,
          },
        );
        return normalizeAttractionExploreCandidates(handleResponse(response));
      },
      MOCK_ATTRACTION_EXPLORE_CANDIDATES,
    ),

  removeCandidate: async (
    payload: AttractionExploreRemoveCandidateRequest,
  ): Promise<AttractionExploreCandidatesResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.delete<ApiResponseWrapper<unknown>>(
          `${tripBase(payload.tripId)}/candidates/${encodeURIComponent(payload.candidateId)}`,
        );
        const data = normalizeAttractionExploreCandidates(handleResponse(response));
        logIntegration('DELETE candidate', {
          candidateId: payload.candidateId,
          count: data.candidates.length,
          summary: data.summary,
        });
        return data;
      },
      normalizeAttractionExploreCandidates({
        ...MOCK_ATTRACTION_EXPLORE_CANDIDATES,
        candidates: MOCK_ATTRACTION_EXPLORE_CANDIDATES.candidates.filter(
          (candidate) => candidate.id !== payload.candidateId,
        ),
        summary: {
          ...MOCK_ATTRACTION_EXPLORE_CANDIDATES.summary,
          attractionCount: Math.max(
            0,
            MOCK_ATTRACTION_EXPLORE_CANDIDATES.summary.attractionCount - 1,
          ),
        },
      }),
    ),

  reorderCandidates: async (
    payload: AttractionExploreReorderCandidatesRequest,
  ): Promise<AttractionExploreCandidatesResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.patch<ApiResponseWrapper<unknown>>(
          `${tripBase(payload.tripId)}/candidates`,
          payload,
        );
        return normalizeAttractionExploreCandidates(handleResponse(response));
      },
      MOCK_ATTRACTION_EXPLORE_CANDIDATES,
    ),

  autoArrange: async (
    payload: AttractionExploreAutoArrangeRequest,
  ): Promise<AttractionExploreAutoArrangeResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.post<ApiResponseWrapper<unknown>>(
          `${tripBase(payload.tripId)}/auto-arrange`,
          payload,
        );
        return normalizeAttractionExploreAutoArrange(handleResponse(response));
      },
      { message: '已提交自动编排任务' },
    ),

  consultAi: async (
    payload: AttractionExploreAiConsultRequest,
  ): Promise<AttractionExploreAiConsultResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.post<ApiResponseWrapper<AttractionExploreAiConsultResponse>>(
          `${tripBase(payload.tripId)}/ai-consult`,
          payload,
        );
        return handleResponse(response);
      },
      {
        answer:
          '基于你的候选清单，建议 Day 1–2 走黄金圈（瀑布 + 间歇泉），Day 3 南岸冰河湖与钻石沙滩；蓝湖可安排在返程前放松。',
      },
    ),

  getMap: async (
    tripId: string,
    params?: {
      candidateIds?: string[];
      viewTab?: AttractionExploreViewTab;
      dayIndex?: number;
      highlightItemId?: string;
      includeInsertHints?: boolean;
      useLiveRoutes?: boolean;
    },
  ): Promise<AttractionExploreMapResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.get<ApiResponseWrapper<unknown>>(
          `${tripBase(tripId)}/map`,
          {
            params: {
              candidateIds: params?.candidateIds?.join(','),
              viewTab: params?.viewTab,
              dayIndex: params?.dayIndex,
              highlightItemId: params?.highlightItemId,
              includeInsertHints: params?.includeInsertHints ? 'true' : undefined,
              ...liveRoutesQueryParam(params?.useLiveRoutes),
            },
          },
        );
        return normalizeAttractionExploreMap(handleResponse(response));
      },
      { points: [] },
    ),

  createMapPlaceProposal: async (
    payload: AttractionExploreMapPlaceProposalRequest,
  ): Promise<AttractionExploreMapPlaceProposalResponse> =>
    withOptionalMock(
      async () => {
        const response = await apiClient.post<ApiResponseWrapper<unknown>>(
          `${tripBase(payload.tripId)}/map/place-proposal`,
          {
            placeId: payload.placeId,
            dayIndex: payload.dayIndex,
            candidateId: payload.candidateId,
            suggestionIndex: payload.suggestionIndex,
            useLiveRoutes: payload.useLiveRoutes === true ? true : undefined,
          },
        );
        const data = normalizeMapPlaceProposal(handleResponse(response));
        logIntegration('POST map/place-proposal', {
          suggestionCount: data.suggestions.length,
          proposalId: data.proposal.proposalId,
        });
        return data;
      },
      normalizeMapPlaceProposal({
        suggestions: [
          {
            dayIndex: payload.dayIndex,
            startTime: '10:30',
            endTime: '12:00',
            detourMinutes: 18,
            label: '顺路插入',
          },
        ],
        mode: 'proposal',
        tripId: payload.tripId,
        proposal: {
          proposalId: 'mock-map-place',
          tripId: payload.tripId,
          intent: 'PLACE_CANDIDATE',
          basePlanVersion: 1,
          contextVersion: 1,
          affectedDays: [payload.dayIndex],
          changes: [],
          validation: { status: 'PASS', warnings: [], conflicts: [] },
          diff: { summary: '地图插入草案', timelineChanges: [] },
          requiresConfirmation: true,
          status: 'AWAITING_CONFIRMATION',
        },
        orchestrationState: {
          tripId: payload.tripId,
          phase: 'AWAITING_CONFIRMATION',
          activeProposalId: 'mock-map-place',
          contextVersion: 1,
        },
      }),
    ),
};
