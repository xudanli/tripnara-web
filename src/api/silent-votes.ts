import apiClient from './client';
import type {
  CreateSilentVoteFromCompareRequest,
  CreateSilentVoteRequest,
  SilentVoteBallot,
  SilentVoteBallotMineResponse,
  SilentVoteDetail,
  SilentVoteListResponse,
  SubmitSilentVoteBallotRequest,
} from '@/types/silent-votes';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class SilentVoteApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'SilentVoteApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '投票请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new SilentVoteApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      err.error?.message?.trim() || fallback,
      err.error?.details,
    );
  }
  return response.data.data;
}

function toApiError(error: unknown, fallback: string): SilentVoteApiError {
  if (error instanceof SilentVoteApiError) return error;

  const err = error as {
    response?: { status?: number; data?: ErrorResponse };
    code?: string;
    message?: string;
    details?: unknown;
  };

  const httpStatus = err.response?.status;
  const body = err.response?.data;

  if (httpStatus === 401) {
    throw new SilentVoteApiError('UNAUTHORIZED', '请先登录');
  }
  if (httpStatus === 403) {
    throw new SilentVoteApiError('FORBIDDEN', body?.error?.message ?? '无权操作此投票');
  }
  if (httpStatus === 404) {
    throw new SilentVoteApiError('NOT_FOUND', body?.error?.message ?? '投票不存在');
  }
  if (httpStatus === 400) {
    throw new SilentVoteApiError(
      'VALIDATION_ERROR',
      body?.error?.message ?? err.message ?? fallback,
      body?.error?.details,
    );
  }
  if (body && body.success === false) {
    throw new SilentVoteApiError(
      body.error?.code ?? 'REQUEST_ERROR',
      body.error?.message ?? fallback,
      body.error?.details,
    );
  }

  throw new SilentVoteApiError(err.code ?? 'REQUEST_ERROR', err.message ?? fallback, err.details);
}

const votesPath = (tripId: string) => `/trips/${tripId}/silent-votes`;

export const silentVotesApi = {
  /** GET /trips/:tripId/silent-votes */
  async list(tripId: string): Promise<SilentVoteListResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<SilentVoteListResponse>>(votesPath(tripId));
      return handleResponse(res, '加载投票列表失败');
    } catch (e) {
      throw toApiError(e, '加载投票列表失败');
    }
  },

  /** POST /trips/:tripId/silent-votes/from-compare */
  async createFromCompare(
    tripId: string,
    body: CreateSilentVoteFromCompareRequest,
  ): Promise<SilentVoteDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<SilentVoteDetail>>(
        `${votesPath(tripId)}/from-compare`,
        body,
      );
      return handleResponse(res, '发起投票失败');
    } catch (e) {
      throw toApiError(e, '发起投票失败');
    }
  },

  /** POST /trips/:tripId/silent-votes */
  async create(tripId: string, body: CreateSilentVoteRequest): Promise<SilentVoteDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<SilentVoteDetail>>(votesPath(tripId), body);
      return handleResponse(res, '创建投票失败');
    } catch (e) {
      throw toApiError(e, '创建投票失败');
    }
  },

  /** GET /trips/:tripId/silent-votes/:voteId */
  async getDetail(tripId: string, voteId: string): Promise<SilentVoteDetail> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<SilentVoteDetail>>(
        `${votesPath(tripId)}/${voteId}`,
      );
      return handleResponse(res, '加载投票详情失败');
    } catch (e) {
      throw toApiError(e, '加载投票详情失败');
    }
  },

  /** POST /trips/:tripId/silent-votes/:voteId/open */
  async open(tripId: string, voteId: string): Promise<SilentVoteDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<SilentVoteDetail>>(
        `${votesPath(tripId)}/${voteId}/open`,
      );
      return handleResponse(res, '开放投票失败');
    } catch (e) {
      throw toApiError(e, '开放投票失败');
    }
  },

  /** POST /trips/:tripId/silent-votes/:voteId/close */
  async close(tripId: string, voteId: string): Promise<SilentVoteDetail> {
    try {
      const res = await apiClient.post<ApiResponseWrapper<SilentVoteDetail>>(
        `${votesPath(tripId)}/${voteId}/close`,
      );
      return handleResponse(res, '关闭投票失败');
    } catch (e) {
      throw toApiError(e, '关闭投票失败');
    }
  },

  /** PUT /trips/:tripId/silent-votes/:voteId/ballot */
  async submitBallot(
    tripId: string,
    voteId: string,
    body: SubmitSilentVoteBallotRequest,
  ): Promise<SilentVoteBallot> {
    try {
      const res = await apiClient.put<ApiResponseWrapper<SilentVoteBallot>>(
        `${votesPath(tripId)}/${voteId}/ballot`,
        body,
      );
      return handleResponse(res, '提交选票失败');
    } catch (e) {
      throw toApiError(e, '提交选票失败');
    }
  },

  /** GET /trips/:tripId/silent-votes/:voteId/ballot/mine */
  async getMyBallot(tripId: string, voteId: string): Promise<SilentVoteBallotMineResponse> {
    try {
      const res = await apiClient.get<ApiResponseWrapper<SilentVoteBallotMineResponse>>(
        `${votesPath(tripId)}/${voteId}/ballot/mine`,
      );
      return handleResponse(res, '加载我的选票失败');
    } catch (e) {
      throw toApiError(e, '加载我的选票失败');
    }
  },
};
