import apiClient from './client';
import type {
  DailyLoadScanRequest,
  DailyLoadScanResponse,
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

class DailyLoadApiError extends Error {
  readonly code?: DecisionSemanticsErrorCode;

  constructor(message: string, code?: DecisionSemanticsErrorCode) {
    super(message);
    this.name = 'DailyLoadApiError';
    this.code = code;
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) throw new DailyLoadApiError('无效的 API 响应');
  if (!response.data.success) {
    const err = response.data.error;
    throw new DailyLoadApiError(err?.message ?? '请求失败', err?.code);
  }
  if (response.data.data == null) {
    throw new DailyLoadApiError('API 响应数据为空');
  }
  return response.data.data;
}

export const dailyLoadApi = {
  /**
   * POST /trips/:tripId/daily-load/scan
   * Gateway 统一入口 — CanonicalDecisionEngineAdapter.scanDailyLoad()
   */
  scan: async (
    tripId: string,
    body: DailyLoadScanRequest = {},
  ): Promise<DailyLoadScanResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<DailyLoadScanResponse>>(
      `/trips/${encodeURIComponent(tripId)}/daily-load/scan`,
      body,
    );
    return handleResponse(response);
  },
};

export { DailyLoadApiError };
