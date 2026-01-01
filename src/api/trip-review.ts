import apiClient from './client';
import type {
  TripReview,
  TripReviewDetail,
  ExecutionEvent,
  ReviewInsight,
  AnchorRule,
  ReviewSummary,
} from '@/types/trip-review';

// 文档中的响应格式是 { success: true, data: T }
interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

// 辅助函数：处理API响应
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  if (!response.data.success) {
    const errorResponse = response.data as ErrorResponse;
    throw new Error(errorResponse.error?.message || '请求失败');
  }
  const successResponse = response.data as SuccessResponse<T>;
  return successResponse.data;
}

// ==================== 复盘接口 ====================

export const tripReviewApi = {
  /**
   * 生成复盘
   * POST /trips/:tripId/review/generate
   * 产出 insights + anchors_suggested
   */
  generate: async (tripId: string): Promise<TripReviewDetail> => {
    const response = await apiClient.post<ApiResponseWrapper<TripReviewDetail>>(
      `/trips/${tripId}/review/generate`,
      {}
    );
    return handleResponse(response);
  },

  /**
   * 获取复盘数据
   * GET /trips/:tripId/review
   */
  getReview: async (tripId: string): Promise<TripReviewDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<TripReviewDetail>>(
      `/trips/${tripId}/review`
    );
    return handleResponse(response);
  },

  /**
   * 用户纠正证据
   * PATCH /trips/:tripId/review/events/:eventId
   */
  updateEvent: async (
    tripId: string,
    eventId: string,
    data: Partial<ExecutionEvent>
  ): Promise<ExecutionEvent> => {
    const response = await apiClient.patch<ApiResponseWrapper<ExecutionEvent>>(
      `/trips/${tripId}/review/events/${eventId}`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 导出复盘
   * POST /trips/:tripId/review/export
   * @param format 'pdf' | 'md'
   */
  exportReview: async (tripId: string, format: 'pdf' | 'md'): Promise<Blob> => {
    const response = await apiClient.post<Blob>(
      `/trips/${tripId}/review/export`,
      { format },
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};

// ==================== 锚点接口 ====================

export const anchorApi = {
  /**
   * 保存锚点
   * POST /profile/anchors
   */
  save: async (data: Omit<AnchorRule, 'anchorId' | 'createdAt' | 'updatedAt'>): Promise<AnchorRule> => {
    const response = await apiClient.post<ApiResponseWrapper<AnchorRule>>('/profile/anchors', data);
    return handleResponse(response);
  },

  /**
   * 编辑/禁用锚点
   * PATCH /profile/anchors/:anchorId
   */
  update: async (anchorId: string, data: Partial<AnchorRule>): Promise<AnchorRule> => {
    const response = await apiClient.patch<ApiResponseWrapper<AnchorRule>>(
      `/profile/anchors/${anchorId}`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取用户所有锚点
   * GET /profile/anchors
   */
  getAll: async (): Promise<AnchorRule[]> => {
    const response = await apiClient.get<ApiResponseWrapper<AnchorRule[]>>('/profile/anchors');
    return handleResponse(response);
  },

  /**
   * 删除锚点
   * DELETE /profile/anchors/:anchorId
   */
  delete: async (anchorId: string): Promise<void> => {
    await apiClient.delete(`/profile/anchors/${anchorId}`);
  },
};

