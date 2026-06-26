import apiClient from './client';
import { CONFIG } from '@/constants/config';
import type {
  ConfirmPlanRequest,
  ConfirmPlanResponse,
  QuickPlanRequest,
  QuickPlanResponse,
} from '@/types/quick-plan';

const QUICK_PLAN_PATH = '/agent/quick-plan';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code?: string; message?: string };
}

type Wrap<T> = SuccessResponse<T> | ErrorResponse;

function unwrap<T>(response: { data: Wrap<T> | T }): T {
  const raw = response?.data as unknown;
  if (raw && typeof raw === 'object' && 'success' in raw) {
    const wrapped = raw as Wrap<T>;
    if (wrapped.success === false) {
      const err = wrapped.error;
      throw new Error(err?.message || err?.code || '快速规划请求失败');
    }
    if (wrapped.success === true) {
      const data = wrapped.data;
      if (data === undefined || data === null) {
        throw new Error('API 响应 data 为空');
      }
      return data;
    }
  }
  return raw as T;
}

export const quickPlanApi = {
  /** POST /agent/quick-plan — 单次澄清 + 预览 */
  quickPlan: async (request: QuickPlanRequest): Promise<QuickPlanResponse> => {
    const response = await apiClient.post<Wrap<QuickPlanResponse> | QuickPlanResponse>(
      QUICK_PLAN_PATH,
      request,
      { timeout: CONFIG.API.TIMEOUT_LONG }
    );
    return unwrap(response);
  },

  /** POST /agent/quick-plan/confirm — 确认并生成最终行程 */
  confirmPlan: async (request: ConfirmPlanRequest): Promise<ConfirmPlanResponse> => {
    const response = await apiClient.post<Wrap<ConfirmPlanResponse> | ConfirmPlanResponse>(
      `${QUICK_PLAN_PATH}/confirm`,
      request,
      { timeout: CONFIG.API.TIMEOUT_LONG }
    );
    return unwrap(response);
  },
};
