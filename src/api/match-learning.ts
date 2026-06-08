/**
 * Match Learning API — P3 Soft Weights 自迭代（运维 / Debug）
 * @see Decision OS · Match Learning 前端/运维集成说明
 *
 * 正常运行依赖后端 Cron，前端无需调用；本客户端供 Staging 验收与透明度展示。
 */

import apiClient from './client';
import { matchLearningMockStore } from '@/features/match-square/lib/match-learning-mock-store';
import { withMatchSquareFallback } from '@/features/match-square/lib/match-square-api-mode';
import type {
  MatchLearningManualRunResult,
  MatchLearningRunsResponse,
  MatchLearningWeightsSnapshot,
} from '@/types/match-learning';

const BASE_PATH = '/match-learning';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

function unwrap<T>(payload: SuccessResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as SuccessResponse<T>).data;
  }
  return payload as T;
}

export class MatchLearningApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'MatchLearningApiError';
  }
}

function toApiError(error: unknown, fallback: string): MatchLearningApiError {
  const err = error as {
    response?: { data?: { error?: { code?: string; message?: string } } };
    message?: string;
  };
  const code = err.response?.data?.error?.code ?? 'REQUEST_ERROR';
  const message = err.response?.data?.error?.message ?? err.message ?? fallback;
  return new MatchLearningApiError(code, message);
}

async function live<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const matchLearningApi = {
  getWeights: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<MatchLearningWeightsSnapshot>>(
            `${BASE_PATH}/weights`
          );
          return unwrap(response.data);
        }, '获取撮合权重失败'),
      () => matchLearningMockStore.getWeights()
    ),

  getRuns: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<MatchLearningRunsResponse>>(
            `${BASE_PATH}/weights/runs`
          );
          return unwrap(response.data);
        }, '获取权重审计记录失败'),
      () => matchLearningMockStore.getRuns()
    ),

  /** Staging 手动触发；生产可能由 MATCH_LEARNING_MANUAL_RUN=false 禁用 */
  runWeekly: () =>
    withMatchSquareFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<MatchLearningManualRunResult>>(
            `${BASE_PATH}/weights/run-weekly`
          );
          return unwrap(response.data);
        }, '手动触发权重迭代失败'),
      () => matchLearningMockStore.runWeekly()
    ),
};
