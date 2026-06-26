import apiClient from './client';
import {
  normalizeActivePreferenceRound,
  normalizePreferenceRoundDetail,
  normalizePreferenceRoundListResponse,
  normalizeVoiceGuardStatus,
} from '@/lib/normalize-process-fairness';
import type {
  ActivePreferenceRoundResponse,
  CreatePreferenceRoundRequest,
  PreferenceRoundDetail,
  PreferenceRoundListResponse,
  SubmitHeardVotesRequest,
  SubmitUtteranceRequest,
  VoiceGuardStatus,
} from '@/types/process-fairness';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class ProcessFairnessApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ProcessFairnessApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new ProcessFairnessApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      err.error?.message?.trim() || fallback,
      err.error?.details,
    );
  }
  return response.data.data;
}

function toApiError(error: unknown, fallback: string): ProcessFairnessApiError {
  if (error instanceof ProcessFairnessApiError) return error;

  const err = error as {
    response?: { status?: number; data?: ErrorResponse };
    code?: string;
    message?: string;
    details?: unknown;
  };

  const httpStatus = err.response?.status;
  const body = err.response?.data;

  if (httpStatus === 401) {
    throw new ProcessFairnessApiError('UNAUTHORIZED', '请先登录');
  }
  if (httpStatus === 403) {
    throw new ProcessFairnessApiError('FORBIDDEN', body?.error?.message ?? '无权访问此行程');
  }
  if (httpStatus === 404) {
    throw new ProcessFairnessApiError('NOT_FOUND', body?.error?.message ?? '轮次不存在');
  }
  if (httpStatus === 409) {
    throw new ProcessFairnessApiError(
      'CONFLICT',
      body?.error?.message ?? '该领域已有进行中的轮次',
      body?.error?.details,
    );
  }
  if (httpStatus === 400) {
    throw new ProcessFairnessApiError(
      'BAD_REQUEST',
      body?.error?.message ?? err.message ?? fallback,
      body?.error?.details,
    );
  }
  if (body && body.success === false) {
    throw new ProcessFairnessApiError(
      body.error?.code ?? 'REQUEST_ERROR',
      body.error?.message ?? fallback,
      body.error?.details,
    );
  }

  throw new ProcessFairnessApiError(err.code ?? 'REQUEST_ERROR', err.message ?? fallback, err.details);
}

const roundsPath = (tripId: string) => `/trips/${tripId}/preference-rounds`;

export const processFairnessApi = {
  /** GET /trips/:tripId/preference-rounds */
  async listRounds(tripId: string): Promise<PreferenceRoundListResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<unknown>>(roundsPath(tripId));
      return normalizePreferenceRoundListResponse(handleResponse(res, '加载轮次列表失败'));
    } catch (e) {
      throw toApiError(e, '加载轮次列表失败');
    }
  },

  /** GET /trips/:tripId/preference-rounds/active?domain=... */
  async getActiveRound(tripId: string, domain: string): Promise<ActivePreferenceRoundResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<unknown>>(`${roundsPath(tripId)}/active`, {
        params: { domain },
      });
      return normalizeActivePreferenceRound(handleResponse(res, '查询进行中轮次失败'));
    } catch (e) {
      throw toApiError(e, '查询进行中轮次失败');
    }
  },

  /** POST /trips/:tripId/preference-rounds */
  async createRound(tripId: string, body: CreatePreferenceRoundRequest): Promise<PreferenceRoundDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<unknown>>(roundsPath(tripId), body);
      const detail = normalizePreferenceRoundDetail(handleResponse(res, '发起轮次失败'));
      if (!detail) throw new ProcessFairnessApiError('INVALID_RESPONSE', '发起轮次失败');
      return detail;
    } catch (e) {
      throw toApiError(e, '发起轮次失败');
    }
  },

  /** GET /trips/:tripId/preference-rounds/:roundId */
  async getRoundDetail(tripId: string, roundId: string): Promise<PreferenceRoundDetail> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<unknown>>(
        `${roundsPath(tripId)}/${roundId}`,
      );
      const detail = normalizePreferenceRoundDetail(handleResponse(res, '加载轮次详情失败'));
      if (!detail) throw new ProcessFairnessApiError('INVALID_RESPONSE', '加载轮次详情失败');
      return detail;
    } catch (e) {
      throw toApiError(e, '加载轮次详情失败');
    }
  },

  /** POST /trips/:tripId/preference-rounds/:roundId/utterances */
  async submitUtterance(
    tripId: string,
    roundId: string,
    body: SubmitUtteranceRequest,
  ): Promise<PreferenceRoundDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<unknown>>(
        `${roundsPath(tripId)}/${roundId}/utterances`,
        body,
      );
      const detail = normalizePreferenceRoundDetail(handleResponse(res, '提交发言失败'));
      if (!detail) throw new ProcessFairnessApiError('INVALID_RESPONSE', '提交发言失败');
      return detail;
    } catch (e) {
      throw toApiError(e, '提交发言失败');
    }
  },

  /** POST /trips/:tripId/preference-rounds/:roundId/heard-votes */
  async submitHeardVotes(
    tripId: string,
    roundId: string,
    body: SubmitHeardVotesRequest,
  ): Promise<PreferenceRoundDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<unknown>>(
        `${roundsPath(tripId)}/${roundId}/heard-votes`,
        body,
      );
      const detail = normalizePreferenceRoundDetail(handleResponse(res, '提交投票失败'));
      if (!detail) throw new ProcessFairnessApiError('INVALID_RESPONSE', '提交投票失败');
      return detail;
    } catch (e) {
      throw toApiError(e, '提交投票失败');
    }
  },

  /** POST /trips/:tripId/preference-rounds/:roundId/close */
  async closeRound(tripId: string, roundId: string): Promise<PreferenceRoundDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<unknown>>(
        `${roundsPath(tripId)}/${roundId}/close`,
      );
      const detail = normalizePreferenceRoundDetail(handleResponse(res, '结束轮次失败'));
      if (!detail) throw new ProcessFairnessApiError('INVALID_RESPONSE', '结束轮次失败');
      return detail;
    } catch (e) {
      throw toApiError(e, '结束轮次失败');
    }
  },

  /** GET /trips/:tripId/voice-guard/status */
  async getVoiceGuardStatus(tripId: string): Promise<VoiceGuardStatus> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<unknown>>(
        `/trips/${tripId}/voice-guard/status`,
      );
      const status = normalizeVoiceGuardStatus(handleResponse(res, '加载发言权保障状态失败'));
      if (!status) throw new ProcessFairnessApiError('INVALID_RESPONSE', '加载发言权保障状态失败');
      return status;
    } catch (e) {
      throw toApiError(e, '加载发言权保障状态失败');
    }
  },
};
