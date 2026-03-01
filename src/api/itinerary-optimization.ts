import apiClient from './client';
import type {
  OptimizeRouteRequest,
  OptimizeRouteResponse,
  NaturalLanguageToParamsRequest,
  NaturalLanguageToParamsResponse,
  HumanizeResultRequest,
  HumanizeResultResponse,
} from '@/types/itinerary-optimization';

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
  // 如果响应数据不存在，抛出错误
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  
  // 检查是否是错误响应
  if (!response.data.success) {
    throw new Error(response.data.error?.message || '请求失败');
  }
  
  // 返回数据
  return response.data.data;
}

// ==================== 行程规划模块 API ====================

export const itineraryOptimizationApi = {
  /**
   * 优化路线（节奏感算法）
   * POST /itinerary-optimization/optimize
   * 响应结构：{ success, data: { optimization: RouteSolution, applied } }
   * 前端使用 data.optimization（含 happinessScore、scoreBreakdown、nodes、schedule）
   */
  optimize: async (data: OptimizeRouteRequest): Promise<OptimizeRouteResponse> => {
    const response = await apiClient.post<
      ApiResponseWrapper<{ optimization: OptimizeRouteResponse; applied?: unknown }>
    >('/itinerary-optimization/optimize', data);
    const raw = handleResponse(response);
    return raw?.optimization ?? raw;
  },

  /**
   * 自然语言转参数
   * POST /llm/natural-language-to-params
   */
  naturalLanguageToParams: async (
    data: NaturalLanguageToParamsRequest
  ): Promise<NaturalLanguageToParamsResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<NaturalLanguageToParamsResponse['data']>>(
      '/llm/natural-language-to-params',
      data
    );
    return handleResponse(response);
  },

  /**
   * 结果人性化转化
   * POST /llm/humanize-result
   */
  humanizeResult: async (
    data: HumanizeResultRequest
  ): Promise<HumanizeResultResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<HumanizeResultResponse['data']>>(
      '/llm/humanize-result',
      data
    );
    return handleResponse(response);
  },
};

