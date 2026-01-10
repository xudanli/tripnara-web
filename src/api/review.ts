import apiClient from './client';
import type {
  TripReviewData,
  GenerateReviewRequest,
  GenerateReviewResponse,
  UpdateEventRequest,
  ExecutionEvent,
  AnchorRule,
  SaveAnchorRequest,
  UpdateAnchorRequest,
  ExportReviewRequest,
  ExportReviewResponse,
} from '@/types/review';

// ==================== 响应包装类型 ====================

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

// ==================== 辅助函数：处理API响应 ====================

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

// ==================== 复盘 API ====================

export const reviewApi = {
  /**
   * 生成复盘
   * POST /trips/:tripId/review/generate
   */
  async generateReview(request: GenerateReviewRequest): Promise<GenerateReviewResponse> {
    const response = await apiClient.post<ApiResponseWrapper<GenerateReviewResponse>>(
      `/trips/${request.tripId}/review/generate`,
      {
        planVersionId: request.planVersionId,
        executionVersionId: request.executionVersionId,
      }
    );
    return handleResponse(response);
  },

  /**
   * 获取复盘数据
   * GET /trips/:tripId/review
   */
  async getReview(tripId: string): Promise<TripReviewData> {
    const response = await apiClient.get<ApiResponseWrapper<TripReviewData>>(
      `/trips/${tripId}/review`
    );
    return handleResponse(response);
  },

  /**
   * 用户纠正证据事件
   * PATCH /trips/:tripId/review/events/:eventId
   */
  async updateEvent(
    tripId: string,
    eventId: string,
    request: UpdateEventRequest
  ): Promise<ExecutionEvent> {
    const response = await apiClient.patch<ApiResponseWrapper<ExecutionEvent>>(
      `/trips/${tripId}/review/events/${eventId}`,
      request
    );
    return handleResponse(response);
  },

  /**
   * 保存锚点规则
   * POST /profile/anchors
   */
  async saveAnchor(request: SaveAnchorRequest): Promise<AnchorRule> {
    const response = await apiClient.post<ApiResponseWrapper<AnchorRule>>(
      '/profile/anchors',
      request
    );
    return handleResponse(response);
  },

  /**
   * 更新锚点规则
   * PATCH /profile/anchors/:anchorId
   */
  async updateAnchor(anchorId: string, request: UpdateAnchorRequest): Promise<AnchorRule> {
    const response = await apiClient.patch<ApiResponseWrapper<AnchorRule>>(
      `/profile/anchors/${anchorId}`,
      request
    );
    return handleResponse(response);
  },

  /**
   * 获取用户的所有锚点规则
   * GET /profile/anchors
   */
  async getAnchors(): Promise<AnchorRule[]> {
    const response = await apiClient.get<ApiResponseWrapper<AnchorRule[]>>('/profile/anchors');
    return handleResponse(response);
  },

  /**
   * 导出复盘（PDF/Markdown）
   * POST /trips/:tripId/review/export
   */
  async exportReview(tripId: string, request: ExportReviewRequest): Promise<ExportReviewResponse> {
    const response = await apiClient.post<ApiResponseWrapper<ExportReviewResponse>>(
      `/trips/${tripId}/review/export`,
      request
    );
    return handleResponse(response);
  },
};

