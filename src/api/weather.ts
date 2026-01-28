import apiClient from './client';
import type {
  GetCurrentWeatherParams,
  CurrentWeather,
} from '@/types/weather';

// API 响应包装类型
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

/**
 * 处理 API 响应
 */
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

/**
 * 天气 API 客户端
 */
export const weatherApi = {
  /**
   * 获取指定位置的当前天气数据
   * 
   * @param params 请求参数
   * @returns 当前天气数据
   * 
   * @example
   * ```typescript
   * const weather = await weatherApi.getCurrent({
   *   lat: 64.1466,
   *   lng: -21.9426,
   *   includeWindDetails: true
   * });
   * ```
   */
  getCurrent: async (params: GetCurrentWeatherParams): Promise<CurrentWeather> => {
    const response = await apiClient.get<ApiResponseWrapper<CurrentWeather>>(
      '/weather/current',
      { params }
    );
    return handleResponse(response);
  },
};
