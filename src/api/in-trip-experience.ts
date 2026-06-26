import apiClient from './client';
import type {
  ExperiencePulseInput,
  ExperiencePulseListResult,
  ExperiencePulseSummary,
  ExperiencePulseTrigger,
  ExperienceTagMatchOption,
  PostTripSummary,
  WeightAdjustmentsResult,
} from '@/types/in-trip-experience';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

export class InTripExperienceApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'InTripExperienceApiError';
  }
}

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }, fallback = '请求失败'): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new InTripExperienceApiError(
      err.error?.code ?? 'REQUEST_ERROR',
      err.error?.message ?? fallback,
      err.error?.details,
    );
  }
  return response.data.data;
}

function experiencePath(tripId: string): string {
  return `/trips/${tripId}/in-trip/experience`;
}

export const inTripExperienceApi = {
  getPending: async (tripId: string): Promise<ExperiencePulseTrigger[]> => {
    const response = await apiClient.get<ApiResponseWrapper<ExperiencePulseTrigger[]>>(
      `${experiencePath(tripId)}/pending`,
    );
    return handleResponse(response, '获取微调查触发器失败');
  },

  submitPulse: async (
    tripId: string,
    body: ExperiencePulseInput,
  ): Promise<ExperiencePulseSummary> => {
    const response = await apiClient.post<ApiResponseWrapper<ExperiencePulseSummary>>(
      `${experiencePath(tripId)}/pulses`,
      body,
    );
    return handleResponse(response, '提交微调查失败');
  },

  listPulses: async (
    tripId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ExperiencePulseListResult> => {
    const response = await apiClient.get<ApiResponseWrapper<ExperiencePulseListResult>>(
      `${experiencePath(tripId)}/pulses`,
      { params },
    );
    return handleResponse(response, '获取微调查历史失败');
  },

  getWeightAdjustments: async (tripId: string): Promise<WeightAdjustmentsResult> => {
    const response = await apiClient.get<ApiResponseWrapper<WeightAdjustmentsResult>>(
      `${experiencePath(tripId)}/weight-adjustments`,
    );
    return handleResponse(response, '获取推荐权重变更失败');
  },

  markWeightAdjustmentsRead: async (tripId: string): Promise<void> => {
    const response = await apiClient.post<ApiResponseWrapper<{ ok: true }>>(
      `${experiencePath(tripId)}/weight-adjustments/read`,
    );
    handleResponse(response, '标记权重变更已读失败');
  },

  getPostTripSummary: async (tripId: string): Promise<PostTripSummary> => {
    const response = await apiClient.get<ApiResponseWrapper<PostTripSummary>>(
      `${experiencePath(tripId)}/post-trip-summary`,
    );
    return handleResponse(response, '获取行后总结失败');
  },

  getTagMatchOptions: async (tripId: string): Promise<ExperienceTagMatchOption[]> => {
    const response = await apiClient.get<ApiResponseWrapper<ExperienceTagMatchOption[]>>(
      `${experiencePath(tripId)}/tag-match-options`,
    );
    return handleResponse(response, '获取体验标签选项失败');
  },
};

export function isExperienceLoopDisabledError(error: unknown): boolean {
  return error instanceof InTripExperienceApiError && error.code === 'BUSINESS_ERROR';
}

export function isExperienceLoopNotFoundError(error: unknown): boolean {
  return error instanceof InTripExperienceApiError && error.code === 'NOT_FOUND';
}
