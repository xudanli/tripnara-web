import apiClient from './client';
import type { PlanObjectsQuery, PlanObjectsResponse } from '@/types/plan-objects';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class PlanObjectsApiError extends Error {
  code: string;
  status?: number;
  details?: unknown;

  constructor(code: string, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'PlanObjectsApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function handleResponse<T>(response: { data?: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new PlanObjectsApiError('INVALID_RESPONSE', '无效的 API 响应');
  }
  if (!response.data.success) {
    const err = response.data.error;
    throw new PlanObjectsApiError(
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? '请求失败',
      undefined,
      err?.details,
    );
  }
  if (response.data.data == null) {
    throw new PlanObjectsApiError('EMPTY_DATA', 'plan-objects 响应为空');
  }
  return response.data.data;
}

function isNotFound(error: unknown): boolean {
  if (error instanceof PlanObjectsApiError) return false;
  const axiosStatus = (error as { response?: { status?: number } })?.response?.status;
  return axiosStatus === 404 || axiosStatus === 501;
}

function buildQueryParams(query?: PlanObjectsQuery): Record<string, number> | undefined {
  if (query?.dayNumber == null) return undefined;
  return { dayNumber: query.dayNumber };
}

export const planObjectsApi = {
  /**
   * GET /trips/:tripId/plan-objects
   * 日内 PlanObject 链（Phase 4 调试读模型）
   */
  get: async (tripId: string, query?: PlanObjectsQuery): Promise<PlanObjectsResponse> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<PlanObjectsResponse>>(
        `/trips/${tripId}/plan-objects`,
        { params: buildQueryParams(query) },
      );
      return handleResponse(response);
    } catch (error) {
      if (isNotFound(error)) {
        throw new PlanObjectsApiError('NOT_FOUND', 'plan-objects 接口不可用', 404);
      }
      throw error;
    }
  },
};

export { isNotFound as isPlanObjectsNotFound };
