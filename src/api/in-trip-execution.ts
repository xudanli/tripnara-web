import apiClient from './client';
import type {
  DayVulnerabilityScore,
  EnvironmentEventDetail,
  EnvironmentEventSummary,
  EnvironmentEventVoteRequest,
  EnvironmentEventVoteResult,
  EnvironmentScanResult,
  HandoffMaterializeResult,
  HandoffVerifyResult,
  InTripAnchorSnapshotPublic,
  TodayDashboardSnapshot,
  InTripTodayReadinessDetail,
} from '@/types/in-trip-execution';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class InTripExecutionApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'InTripExecutionApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new InTripExecutionApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      err.error?.message ?? fallback,
      err.error?.details,
    );
  }
  return response.data.data;
}

function basePath(tripId: string): string {
  return `/trips/${tripId}/in-trip`;
}

function envPath(tripId: string): string {
  return `${basePath(tripId)}/environment`;
}

export const inTripExecutionApi = {
  verifyHandoff: async (tripId: string): Promise<HandoffVerifyResult> => {
    const response = await apiClient.post<ApiResponseWrapper<HandoffVerifyResult>>(
      `${basePath(tripId)}/anchor-snapshot/verify`,
    );
    return handleResponse(response, '移交校验失败');
  },

  getAnchorSnapshot: async (tripId: string): Promise<InTripAnchorSnapshotPublic> => {
    const response = await apiClient.get<ApiResponseWrapper<InTripAnchorSnapshotPublic>>(
      `${basePath(tripId)}/anchor-snapshot`,
    );
    return handleResponse(response, '获取锚点快照失败');
  },

  materializeHandoff: async (tripId: string): Promise<HandoffMaterializeResult> => {
    const response = await apiClient.post<ApiResponseWrapper<HandoffMaterializeResult>>(
      `${basePath(tripId)}/anchor-snapshot/materialize`,
    );
    return handleResponse(response, '物化锚点失败');
  },

  getToday: async (tripId: string): Promise<TodayDashboardSnapshot> => {
    const response = await apiClient.get<ApiResponseWrapper<TodayDashboardSnapshot>>(
      `${basePath(tripId)}/today`,
    );
    return handleResponse(response, '获取今日概览失败');
  },

  getTodayReadiness: async (tripId: string): Promise<InTripTodayReadinessDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<InTripTodayReadinessDetail>>(
      `${basePath(tripId)}/readiness/today`,
    );
    return handleResponse(response, '获取今日就绪失败');
  },

  listEnvironmentEvents: async (tripId: string): Promise<EnvironmentEventSummary[]> => {
    const response = await apiClient.get<ApiResponseWrapper<EnvironmentEventSummary[]>>(
      `${envPath(tripId)}/events`,
    );
    return handleResponse(response, '获取环境预警失败');
  },

  getEnvironmentEvent: async (
    tripId: string,
    eventId: string,
  ): Promise<EnvironmentEventDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<EnvironmentEventDetail>>(
      `${envPath(tripId)}/events/${eventId}`,
    );
    return handleResponse(response, '获取环境事件详情失败');
  },

  voteEnvironmentEvent: async (
    tripId: string,
    eventId: string,
    body: EnvironmentEventVoteRequest,
  ): Promise<EnvironmentEventVoteResult> => {
    const response = await apiClient.post<ApiResponseWrapper<EnvironmentEventVoteResult>>(
      `${envPath(tripId)}/events/${eventId}/vote`,
      body,
    );
    return handleResponse(response, '投票失败');
  },

  resolveEnvironmentEvent: async (
    tripId: string,
    eventId: string,
    body?: { planId?: string },
  ): Promise<EnvironmentEventDetail> => {
    const response = await apiClient.post<ApiResponseWrapper<EnvironmentEventDetail>>(
      `${envPath(tripId)}/events/${eventId}/resolve`,
      body ?? {},
    );
    return handleResponse(response, '锁定方案失败');
  },

  getVulnerability: async (tripId: string): Promise<DayVulnerabilityScore[]> => {
    const response = await apiClient.get<ApiResponseWrapper<DayVulnerabilityScore[]>>(
      `${envPath(tripId)}/vulnerability`,
    );
    return handleResponse(response, '获取脆弱度评分失败');
  },

  scanEnvironment: async (tripId: string): Promise<EnvironmentScanResult> => {
    const response = await apiClient.post<ApiResponseWrapper<EnvironmentScanResult>>(
      `${envPath(tripId)}/scan`,
    );
    return handleResponse(response, '环境扫描失败');
  },
};

export function isInTripNotFoundError(error: unknown): boolean {
  return error instanceof InTripExecutionApiError && error.code === 'NOT_FOUND';
}

export function isInTripDisabledError(error: unknown): boolean {
  return error instanceof InTripExecutionApiError && error.code === 'BUSINESS_ERROR';
}

export function isInTripValidationError(error: unknown): boolean {
  return error instanceof InTripExecutionApiError && error.code === 'VALIDATION_ERROR';
}
