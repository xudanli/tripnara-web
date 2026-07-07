import apiClient from './client';
import { DecisionSemanticsApiError } from '@/api/decision-problems';
import {
  normalizeDecisionProblemNegotiationPreflightResponse,
  normalizeStartDecisionProblemNegotiationResponse,
} from '@/lib/normalize-decision-problem-negotiation.util';
import type {
  DecisionProblemNegotiationPreflightResponse,
  DomainRoundConflictDetails,
  StartDecisionProblemNegotiationRequest,
  StartDecisionProblemNegotiationResponse,
} from '@/types/decision-problem-negotiation';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function tripProblemNegotiationsPath(tripId: string, problemId: string, suffix = ''): string {
  return `/trips/${encodeURIComponent(tripId)}/decision-problems/${encodeURIComponent(problemId)}/negotiations${suffix}`;
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new DecisionSemanticsApiError(
      err.error?.message?.trim() || fallback,
      err.error?.code as never,
      err.error?.details,
    );
  }
  if (response.data.data == null) {
    throw new DecisionSemanticsApiError('API 响应数据为空');
  }
  return response.data.data;
}

function toApiError(error: unknown, fallback: string): DecisionSemanticsApiError {
  if (error instanceof DecisionSemanticsApiError) return error;
  const err = error as {
    response?: { status?: number; data?: ErrorResponse };
    message?: string;
  };
  const body = err.response?.data;
  if (body && body.success === false) {
    return new DecisionSemanticsApiError(
      body.error?.message?.trim() || fallback,
      body.error?.code as never,
      body.error?.details,
    );
  }
  return new DecisionSemanticsApiError(err.message ?? fallback);
}

export const decisionProblemNegotiationsApi = {
  /** GET /trips/:tripId/decision-problems/:problemId/negotiations/preflight */
  async preflight(
    tripId: string,
    problemId: string,
    focusConflictId?: string | null,
  ): Promise<DecisionProblemNegotiationPreflightResponse> {
    try {
      const response = await apiClient.get<ApiResponseWrapper<unknown>>(
        tripProblemNegotiationsPath(tripId, problemId, '/preflight'),
        {
          params: focusConflictId ? { focusConflictId } : undefined,
        },
      );
      return normalizeDecisionProblemNegotiationPreflightResponse(handleResponse(response, '校验协商前置条件失败'));
    } catch (error) {
      throw toApiError(error, '校验协商前置条件失败');
    }
  },

  /** POST /trips/:tripId/decision-problems/:problemId/negotiations */
  async start(
    tripId: string,
    problemId: string,
    body: StartDecisionProblemNegotiationRequest = {},
  ): Promise<StartDecisionProblemNegotiationResponse> {
    try {
      const response = await apiClient.post<ApiResponseWrapper<unknown>>(
        tripProblemNegotiationsPath(tripId, problemId),
        body,
      );
      return normalizeStartDecisionProblemNegotiationResponse(handleResponse(response, '发起协商失败'));
    } catch (error) {
      throw toApiError(error, '发起协商失败');
    }
  },
};

export function parseDomainRoundConflictDetails(details: unknown): DomainRoundConflictDetails | null {
  const record = details && typeof details === 'object' ? (details as Record<string, unknown>) : null;
  if (!record) return null;
  return {
    existingRoundId:
      typeof record.existingRoundId === 'string'
        ? record.existingRoundId
        : typeof record.existing_round_id === 'string'
          ? record.existing_round_id
          : undefined,
    existingProblemId:
      typeof record.existingProblemId === 'string'
        ? record.existingProblemId
        : typeof record.existing_problem_id === 'string'
          ? record.existing_problem_id
          : undefined,
    roundDomain:
      typeof record.roundDomain === 'string'
        ? record.roundDomain
        : typeof record.round_domain === 'string'
          ? record.round_domain
          : undefined,
  };
}
