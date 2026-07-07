import apiClient from './client';
import type {
  AiActivityLogDetailResponse,
  AiActivityLogListResponse,
} from './ai-activity-log.types';
import {
  normalizeAiActivityLogDetail,
  normalizeAiActivityLogList,
} from '@/lib/ai-activity-log-normalize.util';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code?: string; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的 API 响应');
  }
  if (!response.data.success) {
    const err = response.data.error;
    const message = err?.message || err?.code || '请求失败';
    const error = new Error(message) as Error & {
      code?: string;
      details?: unknown;
      response?: { status?: number };
    };
    error.code = err?.code;
    error.details = err?.details;
    throw error;
  }
  if (response.data.data === undefined || response.data.data === null) {
    throw new Error('API 响应数据为空');
  }
  return response.data.data;
}

export function isAiActivityLogUnavailable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

/** GET /trips/:tripId/ai-activity-log */
export async function getAiActivityLog(tripId: string): Promise<AiActivityLogListResponse> {
  const response = await apiClient.get<ApiResponseWrapper<unknown>>(
    `/trips/${tripId}/ai-activity-log`,
  );
  return normalizeAiActivityLogList(handleResponse(response));
}

/** GET /trips/:tripId/ai-activity-log/:activityId */
export async function getAiActivityLogDetail(
  tripId: string,
  activityId: string,
): Promise<AiActivityLogDetailResponse> {
  const response = await apiClient.get<ApiResponseWrapper<unknown>>(
    `/trips/${tripId}/ai-activity-log/${encodeURIComponent(activityId)}`,
  );
  return normalizeAiActivityLogDetail(handleResponse(response));
}

export const aiActivityLogApi = {
  list: getAiActivityLog,
  detail: getAiActivityLogDetail,
};
