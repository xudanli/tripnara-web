/**
 * Travel Status BFF — 前端 Client
 * @see docs S1–S4 travel-status integration
 */

import apiClient from './client';
import { normalizeTravelStatusResponse } from '@/lib/travel-status-normalize.util';
import type {
  AcceptRecommendedResponse,
  DecisionQueueItem,
  DecisionQueueResponse,
  MonitoringScanResponse,
  TravelStatusResponse,
  TripContextSnapshot,
  TripIntentPostBody,
  TripIntentRouteResult,
} from './travel-status.types';

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
    const error = new Error(message) as Error & { code?: string; details?: unknown };
    error.code = err?.code;
    error.details = err?.details;
    throw error;
  }
  if (response.data.data === undefined || response.data.data === null) {
    throw new Error('API 响应数据为空');
  }
  return response.data.data;
}

export function isTravelStatusUnavailable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

/** GET /trips/:tripId/travel-status */
export async function getTravelStatus(tripId: string): Promise<TravelStatusResponse> {
  const response = await apiClient.get<ApiResponseWrapper<TravelStatusResponse>>(
    `/trips/${tripId}/travel-status`,
  );
  return normalizeTravelStatusResponse(handleResponse(response));
}

/** GET /trips/:tripId/decision-queue */
export async function getDecisionQueue(tripId: string): Promise<DecisionQueueResponse> {
  const response = await apiClient.get<ApiResponseWrapper<DecisionQueueResponse>>(
    `/trips/${tripId}/decision-queue`,
  );
  return handleResponse(response);
}

/** GET /trips/:tripId/decision-queue/:problemId */
export async function getDecisionQueueItem(
  tripId: string,
  problemId: string,
): Promise<DecisionQueueItem> {
  const response = await apiClient.get<ApiResponseWrapper<DecisionQueueItem>>(
    `/trips/${tripId}/decision-queue/${problemId}`,
  );
  return handleResponse(response);
}

/** POST /trips/:tripId/decision-queue/:problemId/accept-recommended */
export async function acceptRecommended(
  tripId: string,
  problemId: string,
): Promise<AcceptRecommendedResponse> {
  const response = await apiClient.post<ApiResponseWrapper<AcceptRecommendedResponse>>(
    `/trips/${tripId}/decision-queue/${problemId}/accept-recommended`,
  );
  return handleResponse(response);
}

/** GET /trips/:tripId/context-snapshot */
export async function getContextSnapshot(
  tripId: string,
  options?: { persist?: boolean },
): Promise<TripContextSnapshot> {
  const persist = options?.persist ? 1 : 0;
  const response = await apiClient.get<ApiResponseWrapper<TripContextSnapshot>>(
    `/trips/${tripId}/context-snapshot`,
    { params: { persist } },
  );
  return handleResponse(response);
}

/** POST /trips/:tripId/intent */
export async function postTripIntent(
  tripId: string,
  body: TripIntentPostBody,
  dryRun = false,
): Promise<TripIntentRouteResult> {
  const response = await apiClient.post<ApiResponseWrapper<TripIntentRouteResult>>(
    `/trips/${tripId}/intent`,
    body,
    { params: { dryRun: dryRun ? 1 : 0 } },
  );
  return handleResponse(response);
}

/** GET /trips/:tripId/monitoring/items */
export async function getMonitoringItems(tripId: string): Promise<TravelStatusResponse['monitoring']> {
  const response = await apiClient.get<
    ApiResponseWrapper<TravelStatusResponse['monitoring']>
  >(`/trips/${tripId}/monitoring/items`);
  return handleResponse(response);
}

/** POST /trips/:tripId/monitoring/scan */
export async function scanMonitoring(
  tripId: string,
  dayIndex: number,
): Promise<MonitoringScanResponse> {
  const response = await apiClient.post<ApiResponseWrapper<MonitoringScanResponse>>(
    `/trips/${tripId}/monitoring/scan`,
    null,
    { params: { dayIndex } },
  );
  return handleResponse(response);
}

export const travelStatusApi = {
  getStatus: getTravelStatus,
  getDecisionQueue,
  getDecisionQueueItem,
  acceptRecommended,
};

export const tripContextSnapshotApi = {
  getSnapshot: getContextSnapshot,
};

export const tripIntentApi = {
  postIntent: postTripIntent,
};

export const monitoringApi = {
  getItems: getMonitoringItems,
  scan: scanMonitoring,
};

export type {
  AcceptRecommendedResponse,
  DecisionQueueItem,
  DecisionQueueResponse,
  MonitoringScanResponse,
  TravelStatusResponse,
  TripContextSnapshot,
  TripIntentPostBody,
  TripIntentRouteResult,
} from './travel-status.types';
