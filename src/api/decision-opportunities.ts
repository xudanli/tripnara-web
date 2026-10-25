import apiClient from '@/api/client';
import {
  normalizeDecisionOpportunityListResponse,
} from '@/lib/normalize-decision-case.util';
import type {
  DecisionOpportunityListResponse,
  DecisionOpportunitySummary,
} from '@/types/decision-case';

interface ApiResponseWrapper<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

function unwrap<T>(response: { data: ApiResponseWrapper<T> | T }, fallbackMessage: string): T {
  const body = response.data as ApiResponseWrapper<T> & T;
  if (body && typeof body === 'object' && 'data' in body && (body as ApiResponseWrapper<T>).data != null) {
    return (body as ApiResponseWrapper<T>).data as T;
  }
  if (body != null) return body as T;
  throw new Error(fallbackMessage);
}

/**
 * DecisionCase 机会层（未过门槛）— 编排 / Agent /「加入比较」
 * 决策空间队列不读此 API。
 * @see docs/api/decision-case-backend-handoff.md
 */
export const decisionOpportunitiesApi = {
  listByTrip: async (tripId: string): Promise<DecisionOpportunityListResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<unknown>>(
      `/trips/${encodeURIComponent(tripId)}/decision-opportunities`,
    );
    const raw = unwrap(response, '加载决策机会失败');
    return normalizeDecisionOpportunityListResponse(raw, tripId);
  },

  publish: async (
    tripId: string,
    opportunityId: string,
  ): Promise<{ problemId: string; opportunity?: DecisionOpportunitySummary }> => {
    const response = await apiClient.post<
      ApiResponseWrapper<{ problemId?: string; problem_id?: string; opportunity?: unknown }>
    >(
      `/trips/${encodeURIComponent(tripId)}/decision-opportunities/${encodeURIComponent(opportunityId)}/publish`,
    );
    const raw = unwrap(response, '升级决策机会失败') as {
      problemId?: string;
      problem_id?: string;
    };
    const problemId = raw.problemId ?? raw.problem_id;
    if (!problemId?.trim()) {
      throw new Error('升级决策机会失败：缺少 problemId');
    }
    return { problemId: problemId.trim() };
  },
};
