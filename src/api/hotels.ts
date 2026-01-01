import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type { Hotel } from '@/types/hotel';
import type {
  CityHotelRecommendationRequest,
  CityHotelRecommendationResponse,
} from '@/types/places-routes';

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
    throw new Error(response.data.error?.message || '请求失败');
  }
  
  return response.data.data;
}

export const hotelsApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Hotel>>>(
      '/hotels',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Hotel>>(`/hotels/${id}`);
    return response.data;
  },

  create: async (data: Partial<Hotel>) => {
    const response = await apiClient.post<ApiResponse<Hotel>>('/hotels', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Hotel>) => {
    const response = await apiClient.put<ApiResponse<Hotel>>(`/hotels/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/hotels/${id}`);
    return response.data;
  },

  /**
   * 根据城市和星级推荐酒店
   * GET /hotels/recommendations
   */
  getRecommendations: async (
    params: CityHotelRecommendationRequest
  ): Promise<CityHotelRecommendationResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<CityHotelRecommendationResponse['data']>>(
      '/hotels/recommendations',
      { params }
    );
    return handleResponse(response);
  },
};

