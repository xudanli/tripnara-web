import apiClient from './client';
import type {
  DecisionCheckerQuery,
  DecisionCheckerRefreshRequest,
  DecisionCheckerRefreshResponse,
  DecisionCheckerResponse,
} from '@/types/decision-checker';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class DecisionCheckerApiError extends Error {
  code: string;
  status?: number;
  details?: unknown;

  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'DecisionCheckerApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function handleResponse<T>(response: { data?: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new DecisionCheckerApiError('INVALID_RESPONSE', '无效的 API 响应');
  }
  if (!response.data.success) {
    const err = response.data.error;
    throw new DecisionCheckerApiError(
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? '请求失败',
      undefined,
      err?.details,
    );
  }
  if (response.data.data == null) {
    throw new DecisionCheckerApiError('EMPTY_DATA', '决策检查器响应为空');
  }
  return response.data.data;
}

function isNotFound(error: unknown): boolean {
  if (error instanceof DecisionCheckerApiError) return false;
  const axiosStatus = (error as { response?: { status?: number } })?.response?.status;
  return axiosStatus === 404 || axiosStatus === 501;
}

function buildQueryParams(query?: DecisionCheckerQuery): Record<string, string | number | boolean> | undefined {
  if (!query) return undefined;
  const params: Record<string, string | number | boolean> = {};
  if (query.focusConflictId) params.focusConflictId = query.focusConflictId;
  if (query.planId) params.planId = query.planId;
  if (query.constraintsVersion != null) params.constraintsVersion = query.constraintsVersion;
  if (query.includeStale) params.includeStale = true;
  if (query.taskId) params.taskId = query.taskId;
  return Object.keys(params).length > 0 ? params : undefined;
}

export const decisionCheckerApi = {
  /**
   * GET /trips/:tripId/decision-checker
   * 规划工作台决策检查器读模型（四 Tab SSOT）
   */
  get: async (tripId: string, query?: DecisionCheckerQuery): Promise<DecisionCheckerResponse> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<DecisionCheckerResponse>>(
        `/trips/${tripId}/decision-checker`,
        { params: buildQueryParams(query) },
      );
      return handleResponse(response);
    } catch (error) {
      if (isNotFound(error)) {
        throw new DecisionCheckerApiError('NOT_FOUND', '决策检查器接口不可用', 404);
      }
      throw error;
    }
  },

  /**
   * POST /trips/:tripId/decision-checker/refresh
   * 触发 feasibility validate 重算，返回 202 + pollUrl
   */
  refresh: async (
    tripId: string,
    body?: DecisionCheckerRefreshRequest,
  ): Promise<DecisionCheckerRefreshResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<DecisionCheckerRefreshResponse>>(
      `/trips/${tripId}/decision-checker/refresh`,
      body ?? {},
      { validateStatus: (status) => status === 202 || (status >= 200 && status < 300) },
    );
    return handleResponse(response);
  },
};

export { isNotFound as isDecisionCheckerNotFound };
