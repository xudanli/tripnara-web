/**
 * 上传 API
 * 
 * 提供景点图片上传和获取功能
 * 
 * Base URL: /api/upload
 */

import apiClient from './client';
import type {
  GetPlaceImagesResponse,
  UploadPlaceImagesResponse,
} from '@/types/place-image';

export const uploadApi = {
  /**
   * 获取景点图片列表
   * GET /upload/place/:placeId/images
   * 
   * @param placeId - 景点 ID
   * @returns 图片列表数据
   * 
   * @example
   * ```ts
   * const data = await uploadApi.getPlaceImages(123);
   * console.log(data.images); // 图片列表
   * ```
   */
  getPlaceImages: async (placeId: number): Promise<GetPlaceImagesResponse> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: GetPlaceImagesResponse;
        message?: string;
      }>(`/upload/place/${placeId}/images`);

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || '获取图片失败');
    } catch (error: any) {
      console.error('[Upload API] 获取景点图片失败:', error);
      
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }

      // 处理后端错误响应
      if (error.response?.data) {
        const errorMessage =
          error.response.data.message || error.response.data.error || '获取图片失败';
        throw new Error(errorMessage);
      }

      throw new Error(error.message || '获取图片失败，请稍后重试');
    }
  },

  /**
   * 为景点上传图片
   * POST /upload/place/:placeId/images
   * 
   * @param placeId - 景点 ID
   * @param files - 图片文件列表
   * @param captions - 图片说明列表（可选，与 files 一一对应）
   * @returns 上传结果数据
   * 
   * @example
   * ```ts
   * const files = [file1, file2];
   * const captions = ['图片1说明', '图片2说明'];
   * const data = await uploadApi.uploadPlaceImages(123, files, captions);
   * console.log(data.newImages); // 新上传的图片列表
   * ```
   */
  uploadPlaceImages: async (
    placeId: number,
    files: File[],
    captions?: string[]
  ): Promise<UploadPlaceImagesResponse> => {
    try {
      const formData = new FormData();

      // 添加文件
      files.forEach((file) => {
        formData.append('files', file);
      });

      // 添加图片说明（可选）
      if (captions && captions.length > 0) {
        formData.append('captions', JSON.stringify(captions));
      }

      const response = await apiClient.post<{
        success: boolean;
        data: UploadPlaceImagesResponse;
        message?: string;
      }>(
        `/upload/place/${placeId}/images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || '上传失败');
    } catch (error: any) {
      console.error('[Upload API] 上传景点图片失败:', error);

      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }

      // 处理后端错误响应
      if (error.response?.data) {
        const errorMessage =
          error.response.data.message || error.response.data.error || '上传失败';
        throw new Error(errorMessage);
      }

      throw new Error(error.message || '上传失败，请稍后重试');
    }
  },
};

export default uploadApi;
