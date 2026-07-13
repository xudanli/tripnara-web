import apiClient from './client';
import type { TripExecutabilityView } from '@/types/trip-executability';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function unwrapExecutability(response: { data: ApiResponseWrapper<TripExecutabilityView> }): TripExecutabilityView {
  const body = response?.data;
  if (!body?.success || !body.data) {
    throw new Error(body?.error?.message ?? 'executability failed');
  }
  return body.data;
}

export const tripExecutabilityApi = {
  /** GET /trips/:tripId/executability */
  getExecutability: async (
    tripId: string,
    options?: { refresh?: boolean },
  ): Promise<TripExecutabilityView> => {
    const response = await apiClient.get<ApiResponseWrapper<TripExecutabilityView>>(
      `/trips/${tripId}/executability`,
      { params: options?.refresh ? { refresh: true } : undefined },
    );
    return unwrapExecutability(response);
  },

  /** refreshAfterPlanEdit: POST validate + GET ?refresh=true */
  refreshAfterPlanEdit: async (tripId: string): Promise<TripExecutabilityView> => {
    try {
      await apiClient.post(`/trips/${tripId}/feasibility-report/validate`, {});
    } catch {
      // validate 失败时仍尝试拉 executability
    }
    return tripExecutabilityApi.getExecutability(tripId, { refresh: true });
  },

  /** P1：保存自驾设置后刷新 TEP */
  saveSelfDriveSettings: async (
    tripId: string,
    body: import('@/types/tep-item-note').PutTripSelfDriveMetadata,
  ): Promise<TripExecutabilityView> => {
    await apiClient.put(`/trips/${tripId}`, body);
    return tripExecutabilityApi.refreshAfterPlanEdit(tripId);
  },
};
