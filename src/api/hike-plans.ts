/**
 * HikePlan 全生命周期 API
 * @see docs/api/hike-plan-lifecycle.md
 */

import apiClient from './client';
import type { ApiResponse } from '@/types/hiking';
import type {
  CreateHikePlanRequest,
  GenerateHikeReviewRequest,
  GpsTrackResponse,
  HikePlanPrepData,
  HikePlanRecord,
  HikeReviewResponse,
  OnTrailLiveStateDto,
  UpdateHikePlanPrepRequest,
  UpdateHikePlanRequest,
  UpdateOnTrailLiveStateRequest,
  UploadTrackPointsRequest,
  UploadTrackPointsResponse,
} from '@/types/hike-plan';
import type { HikeReview } from '@/types/trail';
import type {
  CreateHikePlanWithSegmentRequest,
  CreateHikePlanWithSegmentResponse,
} from '@/types/hiking-embedded';

function handleResponse<T>(response: { data: ApiResponse<T> }): T {
  if (!response?.data?.success) {
    const errData = response?.data?.error;
    const err = new Error(errData?.message || '请求失败') as Error & { code?: string };
    if (errData?.code) err.code = errData.code;
    throw err;
  }
  if (response.data.data === undefined || response.data.data === null) {
    throw new Error('响应 data 为空');
  }
  return response.data.data;
}

const BASE = '/hiking/hike-plans';

export const hikePlansApi = {
  create: async (body: CreateHikePlanRequest): Promise<HikePlanRecord> => {
    const res = await apiClient.post<ApiResponse<HikePlanRecord>>(BASE, body);
    return handleResponse(res);
  },

  /**
   * P2 原子创建：HikePlan + 追加 hikingSegments[]
   * POST /hiking/hike-plans/with-segment
   */
  createWithSegment: async (
    body: CreateHikePlanWithSegmentRequest
  ): Promise<CreateHikePlanWithSegmentResponse> => {
    const res = await apiClient.post<ApiResponse<CreateHikePlanWithSegmentResponse>>(
      `${BASE}/with-segment`,
      body
    );
    return handleResponse(res);
  },

  list: async (params?: {
    status?: string;
    routeDirectionId?: number;
    /** embedded：仅该 Trip 下当前用户的计划 @see docs/api/embedded-hiking-trip-metadata.md */
    tripId?: string;
  }): Promise<HikePlanRecord[]> => {
    const res = await apiClient.get<ApiResponse<HikePlanRecord[]>>(BASE, { params });
    return handleResponse(res);
  },

  getById: async (id: string): Promise<HikePlanRecord> => {
    const res = await apiClient.get<ApiResponse<HikePlanRecord>>(`${BASE}/${id}`);
    return handleResponse(res);
  },

  update: async (id: string, body: UpdateHikePlanRequest): Promise<HikePlanRecord> => {
    const res = await apiClient.patch<ApiResponse<HikePlanRecord>>(`${BASE}/${id}`, body);
    return handleResponse(res);
  },

  start: async (id: string): Promise<HikePlanRecord> => {
    const res = await apiClient.post<ApiResponse<HikePlanRecord>>(`${BASE}/${id}/start`);
    return handleResponse(res);
  },

  complete: async (id: string): Promise<HikePlanRecord> => {
    const res = await apiClient.post<ApiResponse<HikePlanRecord>>(`${BASE}/${id}/complete`);
    return handleResponse(res);
  },

  getPrep: async (id: string): Promise<HikePlanPrepData> => {
    const res = await apiClient.get<ApiResponse<HikePlanPrepData>>(`${BASE}/${id}/prep`);
    return handleResponse(res);
  },

  updatePrep: async (
    id: string,
    body: UpdateHikePlanPrepRequest
  ): Promise<HikePlanPrepData> => {
    const res = await apiClient.patch<ApiResponse<HikePlanPrepData>>(
      `${BASE}/${id}/prep`,
      body
    );
    return handleResponse(res);
  },

  /**
   * 运营更新 hikingDetail 模板后，按最新 checklistTemplates/permits 重生成 prep
   * POST /hiking/hike-plans/:id/prep/refresh-template（需 JWT）
   * 保留同 id 的 checked / obtained
   */
  refreshPrepTemplate: async (id: string): Promise<HikePlanPrepData> => {
    const res = await apiClient.post<ApiResponse<HikePlanPrepData>>(
      `${BASE}/${id}/prep/refresh-template`
    );
    return handleResponse(res);
  },

  getLiveState: async (id: string): Promise<OnTrailLiveStateDto> => {
    const res = await apiClient.get<ApiResponse<OnTrailLiveStateDto>>(
      `${BASE}/${id}/live-state`
    );
    return handleResponse(res);
  },

  updateLiveState: async (
    id: string,
    body: UpdateOnTrailLiveStateRequest
  ): Promise<OnTrailLiveStateDto> => {
    const res = await apiClient.patch<ApiResponse<OnTrailLiveStateDto>>(
      `${BASE}/${id}/live-state`,
      body
    );
    return handleResponse(res);
  },

  uploadTrackPoints: async (
    id: string,
    body: UploadTrackPointsRequest
  ): Promise<UploadTrackPointsResponse> => {
    const res = await apiClient.post<ApiResponse<UploadTrackPointsResponse>>(
      `${BASE}/${id}/track-points`,
      body
    );
    return handleResponse(res);
  },

  getTrack: async (id: string): Promise<GpsTrackResponse> => {
    const res = await apiClient.get<ApiResponse<GpsTrackResponse>>(`${BASE}/${id}/track`);
    return handleResponse(res);
  },

  getReview: async (id: string): Promise<HikeReviewResponse> => {
    const res = await apiClient.get<ApiResponse<HikeReviewResponse>>(
      `${BASE}/${id}/review`
    );
    return handleResponse(res);
  },

  generateReview: async (
    id: string,
    body?: GenerateHikeReviewRequest
  ): Promise<HikeReviewResponse> => {
    const res = await apiClient.post<ApiResponse<HikeReviewResponse>>(
      `${BASE}/${id}/review/generate`,
      body ?? {}
    );
    return handleResponse(res);
  },

  updateReview: async (id: string, review: Partial<HikeReview>): Promise<HikeReviewResponse> => {
    const res = await apiClient.patch<ApiResponse<HikeReviewResponse>>(
      `${BASE}/${id}/review`,
      { review }
    );
    return handleResponse(res);
  },
};
