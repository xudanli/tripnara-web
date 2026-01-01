import apiClient from './client';
import type {
  TransportPlanRequest,
  TransportPlanResponse,
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

export const transportApi = {
  /**
   * 规划交通路线
   * POST /transport/plan
   */
  plan: async (data: TransportPlanRequest): Promise<TransportPlanResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<TransportPlanResponse['data']>>(
      '/transport/plan',
      data
    );
    return handleResponse(response);
  },
};

