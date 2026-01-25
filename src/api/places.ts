import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type { Place } from '@/types/place';
import type { Place as TripPlace } from '@/types/trip';
import type {
  GetPlaceResponse,
  BatchGetPlacesRequest,
  BatchGetPlacesResponse,
  GetNearbyPlacesParams,
  GetNearbyPlacesResponse,
  GetNearbyRestaurantsParams,
  GetNearbyRestaurantsResponse,
  SearchPlacesParams,
  SearchPlacesResponse,
  SemanticSearchParams,
  SemanticSearchResponse,
  AutocompletePlacesParams,
  AutocompletePlacesResponse,
  HotelRecommendationRequest,
  HotelRecommendation,
  HotelOptionsRequest,
  HotelOptionsResponse,
  RouteDifficultyRequest,
  RouteDifficultyResponse,
} from '@/types/places-routes';

// 文档中的响应格式是 { success: true, data: T }
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
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

// 地点推荐请求参数
export interface PlaceRecommendationsParams {
  tripId?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  preferredTypes?: string;
  preferOffbeat?: boolean;
  limit?: number;
}

export const placesApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Place>>>(
      '/places',
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Place>>(`/places/${id}`);
    return response.data;
  },

  create: async (data: Partial<Place>) => {
    const response = await apiClient.post<ApiResponse<Place>>('/places', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Place>) => {
    const response = await apiClient.put<ApiResponse<Place>>(`/places/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/places/${id}`);
    return response.data;
  },

  /**
   * 获取地点推荐列表
   * GET /places/recommendations
   */
  getRecommendations: async (params?: PlaceRecommendationsParams): Promise<TripPlace[]> => {
    const response = await apiClient.get<ApiResponseWrapper<TripPlace[]>>(
      '/places/recommendations',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 获取地点详情
   * GET /places/:id
   */
  getPlaceDetail: async (id: number): Promise<GetPlaceResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetPlaceResponse['data']>>(
      `/places/${id}`
    );
    return handleResponse(response);
  },

  /**
   * 批量获取地点详情
   * POST /places/batch
   */
  batchGetPlaces: async (data: BatchGetPlacesRequest): Promise<BatchGetPlacesResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<BatchGetPlacesResponse['data']>>(
      '/places/batch',
      data
    );
    return handleResponse(response);
  },

  /**
   * 查找附近的地点
   * GET /places/nearby
   */
  getNearbyPlaces: async (params: GetNearbyPlacesParams): Promise<GetNearbyPlacesResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetNearbyPlacesResponse['data']>>(
      '/places/nearby',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 查找附近的餐厅
   * GET /places/nearby/restaurants
   */
  getNearbyRestaurants: async (
    params: GetNearbyRestaurantsParams
  ): Promise<GetNearbyRestaurantsResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<GetNearbyRestaurantsResponse['data']>>(
      '/places/nearby/restaurants',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 关键词搜索地点
   * GET /places/search
   */
  searchPlaces: async (params: SearchPlacesParams): Promise<SearchPlacesResponse['data']> => {
    try {
      const response = await apiClient.get<ApiResponseWrapper<SearchPlacesResponse['data']>>(
        '/places/search',
        { 
          params,
          timeout: 20000, // 搜索可能需要更长时间，设置为 20 秒
        }
      );
      console.log('[Places API] searchPlaces 响应:', {
        success: response.data?.success,
        dataType: typeof response.data?.data,
        isArray: Array.isArray(response.data?.data),
        dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'N/A',
        rawData: response.data,
      });
      const result = handleResponse(response);
      console.log('[Places API] searchPlaces 处理后的结果:', {
        isArray: Array.isArray(result),
        length: Array.isArray(result) ? result.length : 'N/A',
        result: result,
      });
      return result;
    } catch (error: any) {
      console.error('[Places API] searchPlaces 错误:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        url: error.config?.url,
      });
      // 如果是超时或网络错误，返回空数组而不是抛出错误
      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        console.warn('[Places API] 搜索请求失败，返回空结果');
        return [];
      }
      throw error;
    }
  },

  /**
   * 语义地点搜索
   * GET /places/search/semantic
   */
  semanticSearchPlaces: async (
    params: SemanticSearchParams
  ): Promise<SemanticSearchResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<SemanticSearchResponse['data']>>(
      '/places/search/semantic',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 地点名称自动补全
   * GET /places/autocomplete
   */
  autocompletePlaces: async (
    params: AutocompletePlacesParams
  ): Promise<AutocompletePlacesResponse['data']> => {
    const response = await apiClient.get<ApiResponseWrapper<AutocompletePlacesResponse['data']>>(
      '/places/autocomplete',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 推荐酒店
   * POST /places/hotels/recommend
   * 注意：此接口直接返回数组，没有统一响应包装
   */
  recommendHotels: async (
    data: HotelRecommendationRequest
  ): Promise<HotelRecommendation[]> => {
    const response = await apiClient.post<HotelRecommendation[]>(
      '/places/hotels/recommend',
      data
    );
    // 直接返回数组，不需要handleResponse
    return response.data;
  },

  /**
   * 推荐酒店选项
   * POST /places/hotels/recommend-options
   * 注意：此接口直接返回对象，没有统一响应包装
   */
  recommendHotelOptions: async (
    data: HotelOptionsRequest
  ): Promise<HotelOptionsResponse> => {
    const response = await apiClient.post<HotelOptionsResponse>(
      '/places/hotels/recommend-options',
      data
    );
    // 直接返回对象，不需要handleResponse
    return response.data;
  },

  /**
   * 计算路线难度
   * POST /places/metrics/difficulty
   */
  calculateRouteDifficulty: async (
    data: RouteDifficultyRequest
  ): Promise<RouteDifficultyResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<RouteDifficultyResponse['data']>>(
      '/places/metrics/difficulty',
      data
    );
    return handleResponse(response);
  },
};

