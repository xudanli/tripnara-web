import apiClient from './client';
import type {
  ValidateSafetyRequest,
  ValidateSafetyResponse,
  AdjustPacingRequest,
  AdjustPacingResponse,
  ReplaceNodesRequest,
  ReplaceNodesResponse,
} from '@/types/strategy';

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
    details?: any;
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

export const decisionApi = {
  /**
   * 安全规则校验（Abu策略）
   * POST /decision/validate-safety
   */
  validateSafety: async (data: ValidateSafetyRequest): Promise<ValidateSafetyResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<ValidateSafetyResponse['data']>>(
      '/decision/validate-safety',
      data
    );
    return handleResponse(response);
  },

  /**
   * 行程节奏智能调整（Dr.Dre策略）
   * POST /decision/adjust-pacing
   */
  adjustPacing: async (data: AdjustPacingRequest): Promise<AdjustPacingResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<AdjustPacingResponse['data']>>(
      '/decision/adjust-pacing',
      data
    );
    return handleResponse(response);
  },

  /**
   * 路线节点智能替换（Neptune策略）
   * POST /decision/replace-nodes
   */
  replaceNodes: async (data: ReplaceNodesRequest): Promise<ReplaceNodesResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<ReplaceNodesResponse['data']>>(
      '/decision/replace-nodes',
      data
    );
    return handleResponse(response);
  },
};

