import apiClient from './client';

// ==================== 类型定义 ====================

/**
 * Provider 状态类型
 */
export type ProviderStatus =
  | 'mock'
  | 'google'
  | 'openai'
  | 'anthropic'
  | 'azure'
  | 'osm'
  | 'unavailable';

/**
 * 限流信息
 */
export interface RateLimit {
  enabled: boolean;
  remaining: number | null;
  resetAt: string | null;
}

/**
 * 视觉识别功能配置
 */
export interface VisionFeature {
  enabled: boolean;
  maxFileSize: number;
  supportedFormats: string[];
}

/**
 * 语音功能配置
 */
export interface VoiceFeature {
  enabled: boolean;
  asrEnabled: boolean;
  ttsEnabled: boolean;
}

/**
 * What-If 分析功能配置
 */
export interface WhatIfFeature {
  enabled: boolean;
  maxSamples: number;
}

/**
 * 功能开关状态
 */
export interface Features {
  vision: VisionFeature;
  voice: VoiceFeature;
  whatIf: WhatIfFeature;
}

/**
 * 系统状态响应数据
 */
export interface SystemStatus {
  ocrProvider: ProviderStatus;
  poiProvider: ProviderStatus;
  asrProvider: ProviderStatus;
  ttsProvider: ProviderStatus;
  llmProvider: ProviderStatus;
  rateLimit: RateLimit;
  features: Features;
}

/**
 * 成功响应格式
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
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
 * 获取系统状态响应
 */
export type GetSystemStatusResponse = SuccessResponse<SystemStatus>;

/**
 * API 错误类
 */
export class SystemStatusApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'SystemStatusApiError';
  }
}

// ==================== API 实现 ====================

export const systemApi = {
  /**
   * 获取系统状态
   * GET /system/status
   */
  getStatus: async (): Promise<SystemStatus> => {
    try {
      const response = await apiClient.get<GetSystemStatusResponse>('/system/status');

      // 检查响应格式
      if (!response.data.success) {
        const errorData = response.data as unknown as ErrorResponse;
        throw new SystemStatusApiError(
          errorData.error.code,
          errorData.error.message
        );
      }

      return response.data.data;
    } catch (error: any) {
      // 处理网络错误
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('网络异常，请检查网络连接');
      }

      // 处理已定义的 API 错误
      if (error instanceof SystemStatusApiError) {
        throw error;
      }

      // 处理后端错误响应
      if (error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        if (!errorData.success && errorData.error) {
          throw new SystemStatusApiError(
            errorData.error.code,
            errorData.error.message
          );
        }
      }

      // 处理其他错误
      throw new Error(error.message || '获取系统状态失败，请稍后重试');
    }
  },
};

