/**
 * 地点图片 API（已废弃）
 * 
 * ⚠️ 此 API 已废弃，不再使用 Unsplash API
 * 请使用新的上传 API：@/api/upload
 * 
 * @deprecated 使用 uploadApi.getPlaceImages() 替代
 * 
 * Base URL: /api/places/images
 */

import apiClient from './client';
import type {
  PlaceImageRequest,
  BatchPlaceImagesResponse,
  PlaceImagesCacheStats,
} from '@/types/place-image';

export const placeImagesApi = {
  /**
   * 批量获取地点图片
   * POST /places/images/batch
   * 
   * @param places - 地点列表
   * @returns 图片结果列表
   * 
   * @example
   * ```ts
   * const response = await placeImagesApi.batchGetImages([
   *   { placeName: '富士山', placeNameEn: 'Mount Fuji', country: 'Japan' },
   *   { placeName: '浅草寺', placeNameEn: 'Sensoji Temple', country: 'Japan' },
   * ]);
   * ```
   */
  batchGetImages: async (
    places: PlaceImageRequest[]
  ): Promise<BatchPlaceImagesResponse> => {
    try {
      console.log('[Place Images API] 批量获取图片:', {
        count: places.length,
        places: places.map(p => p.placeName),
      });

      const response = await apiClient.post<BatchPlaceImagesResponse>(
        '/places/images/batch',
        { places },
        { timeout: 30000 } // 批量请求可能需要更长时间
      );

      console.log('[Place Images API] 获取成功:', {
        total: response.data.stats.total,
        found: response.data.stats.found,
        cached: response.data.stats.cached,
        processingTime: response.data.processingTimeMs,
      });

      return response.data;
    } catch (error: any) {
      console.error('[Place Images API] 批量获取失败:', error);
      
      // 返回空结果而不是抛出错误，避免阻塞页面渲染
      return {
        success: false,
        results: places.map(p => ({
          placeId: p.placeId,
          placeName: p.placeName,
          photo: null,
          cached: false,
          error: error.message || '获取图片失败',
        })),
        stats: {
          total: places.length,
          found: 0,
          cached: 0,
          failed: places.length,
        },
        processingTimeMs: 0,
      };
    }
  },

  /**
   * 获取单个地点图片（便捷方法）
   * 内部调用批量接口
   * 
   * @param place - 地点信息
   * @returns 图片数据或 null
   */
  getImage: async (place: PlaceImageRequest) => {
    const response = await placeImagesApi.batchGetImages([place]);
    return response.results[0]?.photo || null;
  },

  /**
   * 获取缓存统计信息
   * GET /places/images/cache-stats
   * 
   * @returns 缓存统计数据
   */
  getCacheStats: async (): Promise<PlaceImagesCacheStats> => {
    try {
      const response = await apiClient.get<PlaceImagesCacheStats>(
        '/places/images/cache-stats'
      );
      return response.data;
    } catch (error: any) {
      console.error('[Place Images API] 获取缓存统计失败:', error);
      throw error;
    }
  },
};

export default placeImagesApi;
