/**
 * Round 3 · Trip Outcome API
 * POST /trips/:tripId/outcome · POST /trips/outcome/batch
 */

import apiClient from './client';
import { withSelfEvolutionFallback } from '@/features/self-evolution/lib/self-evolution-api-mode';
import { selfEvolutionMockStore } from '@/features/self-evolution/lib/mock-store';
import { normalizeTripOutcomeResponse } from '@/features/self-evolution/lib/normalize-self-evolution-response';
import type { TripOutcomeRequest, TripOutcomeResponse } from '@/types/self-evolution';

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

export class TripOutcomeApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'TripOutcomeApiError';
  }
}

function toApiError(error: unknown, fallback: string): TripOutcomeApiError {
  const err = error as {
    response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
    message?: string;
  };
  const status = err.response?.status;
  const code =
    err.response?.data?.error?.code ??
    (status === 404 ? 'NOT_FOUND' : undefined) ??
    'REQUEST_ERROR';
  const message = err.response?.data?.error?.message ?? err.message ?? fallback;
  return new TripOutcomeApiError(code, message);
}

async function live<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export const tripOutcomeApi = {
  getOutcome: (tripId: string) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.get<SuccessResponse<TripOutcomeResponse>>(
            `/trips/${tripId}/outcome`
          );
          return normalizeTripOutcomeResponse(unwrap(response.data));
        }, '获取旅行结果失败'),
      async () => {
        const cached = selfEvolutionMockStore.getCachedOutcome(tripId);
        if (!cached) throw new TripOutcomeApiError('NOT_FOUND', '旅行结果不存在');
        return cached;
      }
    ),

  calculateOutcome: (
    tripId: string,
    data: Omit<TripOutcomeRequest, 'tripId'>
  ) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<TripOutcomeResponse>>(
            `/trips/${tripId}/outcome`,
            { ...data, tripId }
          );
          return normalizeTripOutcomeResponse(unwrap(response.data));
        }, '计算旅行结果失败'),
      async () => selfEvolutionMockStore.calculateOutcome(tripId, data)
    ),

  calculateBatch: (requests: TripOutcomeRequest[]) =>
    withSelfEvolutionFallback(
      () =>
        live(async () => {
          const response = await apiClient.post<SuccessResponse<TripOutcomeResponse[]>>(
            '/trips/outcome/batch',
            requests
          );
          return (unwrap(response.data) as TripOutcomeResponse[]).map(normalizeTripOutcomeResponse);
        }, '批量计算旅行结果失败'),
      async () => selfEvolutionMockStore.calculateBatch(requests)
    ),
};
