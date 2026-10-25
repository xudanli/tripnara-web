/**
 * OR-Tools Shadow 观测 API — ADR-008 / M4-RA-01A
 * 前缀: /decision-engine/v1/ortools-shadow
 * Python sidecar /v1/solve 不对浏览器开放。
 */

import apiClient from './client';
import { normalizeOrtToolsShadowHealthData } from '@/lib/normalize-ortools-shadow.util';
import type { OrtToolsShadowHealthData } from '@/types/ortools-shadow';

const BASE_PATH = '/decision-engine/v1/ortools-shadow';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

function handleResponse<T>(response: { data: ApiEnvelope<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  if (!response.data.success) {
    const err = response.data.error;
    throw new Error(err?.message || '请求失败');
  }
  return response.data.data as T;
}

export const ortoolsShadowApi = {
  /** GET .../health — @Public，可未登录探活 */
  getHealth: async (options?: { signal?: AbortSignal }): Promise<OrtToolsShadowHealthData> => {
    const response = await apiClient.get<ApiEnvelope<unknown>>(`${BASE_PATH}/health`, {
      signal: options?.signal,
      timeout: 10_000,
    });
    return normalizeOrtToolsShadowHealthData(handleResponse(response));
  },
};
