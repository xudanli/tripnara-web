import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * 坐标点
 */
export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * 获取单个坐标点海拔请求参数
 */
export interface GetElevationRequest {
  lat: number;
  lng: number;
}

/**
 * 获取单个坐标点海拔响应
 */
export interface GetElevationResponse {
  lat: number;
  lng: number;
  elevation: number;
  unit: 'meters';
}

/**
 * 活动类型
 */
export type ActivityType = 'walking' | 'driving' | 'cycling';

/**
 * 获取路线海拔剖面请求参数
 */
export interface GetElevationProfileRequest {
  polyline: Coordinate[];
  samples?: number; // 采样间隔（米），默认 100
  activityType?: ActivityType; // 活动类型，默认 'walking'
}

/**
 * 海拔剖面点
 */
export interface ElevationProfilePoint {
  distance: number; // 距离起点的距离（米）
  lat: number;
  lng: number;
  elevation: number; // 海拔（米）
  slope: number; // 坡度（百分比）
  cumulativeAscent: number; // 累计爬升（米）
}

/**
 * 获取路线海拔剖面响应
 */
export interface GetElevationProfileResponse {
  elevationProfile: ElevationProfilePoint[];
  cumulativeAscent: number; // 总累计爬升（米）
  totalDescent: number; // 总累计下降（米）
  maxSlope: number; // 最大坡度（百分比）
  minSlope: number; // 最小坡度（百分比）
  maxElevation: number; // 最高海拔（米）
  minElevation: number; // 最低海拔（米）
  totalDistance: number; // 总距离（米）
  fatigueIndex: number; // 疲劳指数（0-100）
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme'; // 难度等级
  effortScore: number; // 体力消耗评分（0-100）
}

/**
 * 获取行程地形数据请求参数
 */
export interface GetTripTerrainRequest {
  tripId: string;
  samples?: number; // 采样间隔（米）
}

/**
 * 获取行程地形数据响应
 */
export interface GetTripTerrainResponse {
  message: string;
  tripId: string;
}

/**
 * 成功响应格式
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应格式
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 处理API响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }

  return response.data.data;
}

// ==================== API 实现 ====================

export const demApi = {
  /**
   * 获取单个坐标点的海拔
   * GET /api/dem/elevation
   */
  getElevation: async (params: GetElevationRequest): Promise<GetElevationResponse> => {
    try {
      console.log('[DEM API] 发送 getElevation 请求:', {
        lat: params.lat,
        lng: params.lng,
      });

      const response = await apiClient.get<ApiResponseWrapper<GetElevationResponse>>(
        '/dem/elevation',
        {
          params: {
            lat: params.lat,
            lng: params.lng,
          },
        }
      );

      console.log('[DEM API] 收到 getElevation 响应:', {
        elevation: response.data?.success ? response.data.data?.elevation : undefined,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[DEM API] getElevation 请求失败:', {
        error,
        message: error.message,
        params,
      });
      throw error;
    }
  },

  /**
   * 获取路线海拔剖面
   * POST /api/dem/profile
   */
  getElevationProfile: async (
    data: GetElevationProfileRequest
  ): Promise<GetElevationProfileResponse> => {
    try {
      console.log('[DEM API] 发送 getElevationProfile 请求:', {
        polylineLength: data.polyline.length,
        samples: data.samples,
        activityType: data.activityType,
      });

      const response = await apiClient.post<ApiResponseWrapper<GetElevationProfileResponse>>(
        '/dem/profile',
        {
          polyline: data.polyline,
          samples: data.samples ?? 100,
          activityType: data.activityType ?? 'walking',
        },
        {
          timeout: 60000, // 60 秒超时，地形数据查询可能需要较长时间
        }
      );

      console.log('[DEM API] 收到 getElevationProfile 响应:', {
        profilePointsCount: response.data?.success
          ? response.data.data?.elevationProfile?.length
          : 0,
        cumulativeAscent: response.data?.success ? response.data.data?.cumulativeAscent : undefined,
        difficulty: response.data?.success ? response.data.data?.difficulty : undefined,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[DEM API] getElevationProfile 请求失败:', {
        error,
        message: error.message,
        request: data,
      });
      throw error;
    }
  },

  /**
   * 获取行程的地形数据
   * GET /api/dem/trip/:tripId/terrain
   * 注意：此端点目前为占位符，实际应使用 getElevationProfile
   */
  getTripTerrain: async (params: GetTripTerrainRequest): Promise<GetTripTerrainResponse> => {
    try {
      console.log('[DEM API] 发送 getTripTerrain 请求:', {
        tripId: params.tripId,
        samples: params.samples,
      });

      const response = await apiClient.get<ApiResponseWrapper<GetTripTerrainResponse>>(
        `/dem/trip/${params.tripId}/terrain`,
        {
          params: {
            ...(params.samples && { samples: params.samples }),
          },
        }
      );

      console.log('[DEM API] 收到 getTripTerrain 响应:', {
        message: response.data?.success ? response.data.data?.message : undefined,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.error('[DEM API] getTripTerrain 请求失败:', {
        error,
        message: error.message,
        params,
      });
      throw error;
    }
  },
};
