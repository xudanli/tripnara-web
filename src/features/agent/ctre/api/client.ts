/**
 * CTRE (Travel Compiler) Trip 子资源 API
 *
 * 生成过程中 Graph 未落库时 GET 可能 404 — 属正常，实时进度应走 SSE。
 */

import apiClient from '@/api/client';
import type { CtreCompileProgressApiResponse, CtreCompileProgressView } from '../types';
import { normalizeCtreCompileProgress } from '../helpers';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string };
}

type ApiWrapper<T> = SuccessResponse<T> | ErrorResponse;

/** Graph 未落库 / Compiler 未跑过 — 非用户可见错误 */
export function isCtreCompileNotFoundSignal(
  input?: { code?: string; message?: string } | string | null,
): boolean {
  if (!input) return false;
  if (typeof input === 'string') {
    return /no ctre compilation|ctre compilation for trip|未.*编译|尚无.*编译|compile-progress.*not found/i.test(
      input,
    );
  }
  const code = String(input.code ?? '').toUpperCase();
  if (
    code === 'NOT_FOUND' ||
    code === 'NO_CTE_COMPILATION' ||
    code === 'CTRE_NOT_FOUND' ||
    code === 'ENDPOINT_NOT_FOUND'
  ) {
    return true;
  }
  return isCtreCompileNotFoundSignal(input.message ?? null);
}

function isCtreCompileNotFoundHttp(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 404 || status === 501) return true;
  const body = (err as { response?: { data?: ErrorResponse } })?.response?.data;
  if (body && !body.success && isCtreCompileNotFoundSignal(body.error)) return true;
  if (err instanceof Error && isCtreCompileNotFoundSignal(err.message)) return true;
  return false;
}

function unwrap<T>(response: { data: ApiWrapper<T> }): T {
  if (!response?.data?.success) {
    const err = response?.data && 'error' in response.data ? response.data.error : undefined;
    if (isCtreCompileNotFoundSignal(err)) {
      throw Object.assign(new Error(err?.message || 'NOT_FOUND'), { ctreNotFound: true });
    }
    throw new Error(err?.message || err?.code || '请求失败');
  }
  return response.data.data;
}

export type CtreCompileProgressFetchResult = {
  progress: CtreCompileProgressView | null;
  /** Graph 尚未持久化或端点未就绪（404/501/空 progress） */
  notFound: boolean;
};

export const ctreApi = {
  getCompileProgress: async (tripId: string): Promise<CtreCompileProgressFetchResult> => {
    try {
      const response = await apiClient.get<ApiWrapper<CtreCompileProgressApiResponse>>(
        `/trips/${encodeURIComponent(tripId)}/ctre/compile-progress`,
      );
      const data = unwrap(response);
      const progress = normalizeCtreCompileProgress(data.progress);
      if (!progress) return { progress: null, notFound: true };
      return { progress, notFound: false };
    } catch (err) {
      if (
        isCtreCompileNotFoundHttp(err) ||
        (err as { ctreNotFound?: boolean })?.ctreNotFound === true
      ) {
        return { progress: null, notFound: true };
      }
      throw err;
    }
  },
};
