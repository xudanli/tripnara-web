/**
 * POI Resolution API — Base: /api/poi
 */

import apiClient from '@/api/client';
import type {
  ConfirmPoiRequest,
  ConfirmPoiResponse,
  ResolvePoiRequest,
  ResolvePoiResponse,
} from '../types';

const BASE = '/poi';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: unknown };
}

type ApiWrapper<T> = SuccessResponse<T> | ErrorResponse;

function unwrap<T>(response: { data: ApiWrapper<T> }): T {
  if (!response?.data?.success) {
    const err = response?.data && 'error' in response.data ? response.data.error : undefined;
    const message = err?.message || err?.code || '请求失败';
    const error = new Error(message) as Error & { code?: string };
    error.code = err?.code;
    throw error;
  }
  return response.data.data;
}

export async function resolvePoi(params: ResolvePoiRequest): Promise<ResolvePoiResponse> {
  const response = await apiClient.post<ApiWrapper<ResolvePoiResponse>>(`${BASE}/resolve`, params);
  return unwrap(response);
}

export async function confirmPoiResolution(
  token: string,
  params: ConfirmPoiRequest,
): Promise<ConfirmPoiResponse> {
  const response = await apiClient.post<ApiWrapper<ConfirmPoiResponse>>(`${BASE}/confirm`, params, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return unwrap(response);
}
