import apiClient from './client';
import type {
  WeatherHazardPollRequest,
  WeatherHazardPollResponse,
} from '@/types/unified-decision';
import type { DecisionSemanticsErrorCode } from '@/types/decision-problem';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code?: DecisionSemanticsErrorCode; message?: string; details?: unknown };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

class WeatherHazardApiError extends Error {
  readonly code?: DecisionSemanticsErrorCode;

  constructor(message: string, code?: DecisionSemanticsErrorCode) {
    super(message);
    this.name = 'WeatherHazardApiError';
    this.code = code;
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) throw new WeatherHazardApiError('无效的 API 响应');
  if (!response.data.success) {
    const err = response.data.error;
    throw new WeatherHazardApiError(err?.message ?? '请求失败', err?.code);
  }
  if (response.data.data == null) {
    throw new WeatherHazardApiError('API 响应数据为空');
  }
  return response.data.data;
}

export const weatherHazardApi = {
  /**
   * POST /trips/:tripId/weather-hazard/poll
   * Unified 入口 — 替代 deprecated internal API
   */
  poll: async (
    tripId: string,
    body: WeatherHazardPollRequest,
  ): Promise<WeatherHazardPollResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<WeatherHazardPollResponse>>(
      `/trips/${encodeURIComponent(tripId)}/weather-hazard/poll`,
      body,
    );
    return handleResponse(response);
  },
};

export { WeatherHazardApiError };
