import apiClient from './client';
import type {
  GetWeatherParams,
  WeatherData,
  GetSafetyParams,
  SafetyData,
  GetRoadConditionsParams,
  RoadConditionsData,
} from '@/types/iceland-info';

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
 * 冰岛信息源 API 客户端
 * 
 * 提供冰岛官方信息源的API接口，包括：
 * - vedur.is - 冰岛气象局天气预报
 * - safetravel.is - 冰岛旅行安全信息
 * - road.is - 冰岛道路管理局F路路况
 */
export const icelandInfoApi = {
  /**
   * 获取高地天气预报
   * 
   * 从 vedur.is 获取冰岛高地区域的天气预报数据。
   * 
   * @param params 请求参数
   * @returns 天气预报数据
   * 
   * @example
   * ```typescript
   * // 获取中央高地天气预报
   * const weather = await icelandInfoApi.getWeather({
   *   region: 'centralhighlands'
   * });
   * 
   * // 获取指定坐标的天气预报
   * const weather = await icelandInfoApi.getWeather({
   *   lat: 64.5,
   *   lng: -18.5,
   *   includeWindDetails: true
   * });
   * ```
   */
  getWeather: async (params?: GetWeatherParams): Promise<WeatherData> => {
    const response = await apiClient.get<ApiResponseWrapper<WeatherData>>(
      '/iceland-info/weather',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 获取安全信息和旅行条件
   * 
   * 从 safetravel.is 获取安全警报和旅行条件信息。
   * 
   * @param params 请求参数
   * @returns 安全信息数据
   * 
   * @example
   * ```typescript
   * // 获取所有安全信息
   * const safety = await icelandInfoApi.getSafety();
   * 
   * // 获取高地区域的安全信息
   * const safety = await icelandInfoApi.getSafety({
   *   region: 'highlands'
   * });
   * 
   * // 获取天气相关警报
   * const safety = await icelandInfoApi.getSafety({
   *   alertType: 'weather'
   * });
   * ```
   */
  getSafety: async (params?: GetSafetyParams): Promise<SafetyData> => {
    const response = await apiClient.get<ApiResponseWrapper<SafetyData>>(
      '/iceland-info/safety',
      { params }
    );
    return handleResponse(response);
  },

  /**
   * 获取F路路况信息
   * 
   * 从 road.is 获取F路的路况和开放状态信息。
   * 
   * @param params 请求参数
   * @returns F路路况数据
   * 
   * @example
   * ```typescript
   * // 获取所有F路路况
   * const roads = await icelandInfoApi.getRoadConditions();
   * 
   * // 获取指定F路的路况
   * const roads = await icelandInfoApi.getRoadConditions({
   *   fRoads: 'F208,F26,F910'
   * });
   * 
   * // 获取需要谨慎驾驶的F路
   * const roads = await icelandInfoApi.getRoadConditions({
   *   status: 'caution'
   * });
   * ```
   */
  getRoadConditions: async (params?: GetRoadConditionsParams): Promise<RoadConditionsData> => {
    const response = await apiClient.get<ApiResponseWrapper<RoadConditionsData>>(
      '/iceland-info/road-conditions',
      { params }
    );
    return handleResponse(response);
  },
};
