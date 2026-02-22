/**
 * Vision API - 拍照识别 POI 推荐
 *
 * 上传图片，通过 OCR 提取文字，结合位置搜索附近 POI，返回候选列表和「加入行程」建议。
 * 适用场景：招牌、菜单、路牌、景点介绍牌等。
 *
 * 接口文档：docs/api/vision-poi-recommend.md
 */

import apiClient from './client';

// ==================== 类型定义 ====================

export interface VisionOcrResult {
  fullText: string;
  lines: string[];
}

export interface VisionPoiCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceM: number;
  rating?: number;
  isOpenNow?: boolean;
}

export interface VisionSuggestionAction {
  type: string;
  poiId?: string;
  [key: string]: unknown;
}

export interface VisionSuggestion {
  id: string;
  title: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  action: VisionSuggestionAction;
}

export interface VisionPoiRecommendResponse {
  ocrResult: VisionOcrResult;
  candidates: VisionPoiCandidate[];
  suggestions: VisionSuggestion[];
}

export interface VisionCapabilitiesResponse {
  supportedFormats: string[];
  maxFileSize: number;
  maxFileSizeMB: number;
  supportsHeic: boolean;
  requiresCompression: boolean;
  compressionRecommendation?: string;
}

// ==================== API 实现 ====================

export const visionApi = {
  /**
   * 拍照识别 POI 推荐
   * POST /vision/poi-recommend
   *
   * @param image - 图片文件（jpeg/png/heic/webp，最大 6MB）
   * @param lat - 用户当前纬度
   * @param lng - 用户当前经度
   * @param locale - 语言，如 zh-CN、ja-JP、en-US
   */
  poiRecommend: async (
    image: File,
    lat: number,
    lng: number,
    locale?: string
  ): Promise<VisionPoiRecommendResponse> => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('lat', String(lat));
    formData.append('lng', String(lng));
    if (locale) {
      formData.append('locale', locale);
    }

    const response = await apiClient.post<{
      success: boolean;
      data?: VisionPoiRecommendResponse;
      error?: { code: string; message: string };
    }>('/vision/poi-recommend', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    if (response.data.error) {
      throw new Error(response.data.error.message || '拍照识别失败');
    }

    throw new Error('未知的响应格式');
  },

  /**
   * 查询能力（支持的格式、大小等）
   * GET /vision/capabilities
   *
   * 用于前端在上传前校验
   */
  getCapabilities: async (): Promise<VisionCapabilitiesResponse> => {
    const response = await apiClient.get<{
      success: boolean;
      data?: VisionCapabilitiesResponse;
      error?: { code: string; message: string };
    }>('/vision/capabilities');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    if (response.data.error) {
      throw new Error(response.data.error.message || '获取能力失败');
    }

    throw new Error('未知的响应格式');
  },
};
