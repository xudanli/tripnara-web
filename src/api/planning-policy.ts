import apiClient from './client';
import type {
  EvaluateDayRequest,
  EvaluateDayResponse,
  GenerateCandidatesRequest,
  GenerateCandidatesResponse,
  EvaluateCandidatesRequest,
  EvaluateCandidatesResponse,
  WhatIfEvaluateRequest,
  WhatIfEvaluateResponse,
  ApplyCandidateRequest,
  ApplyCandidateResponse,
  ReEvaluateRequest,
  ReEvaluateResponse,
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

export const planningPolicyApi = {
  /**
   * 仅评估 base 指标
   * POST /planning-policy/robustness/evaluate-day
   */
  evaluateDay: async (data: EvaluateDayRequest): Promise<EvaluateDayResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<EvaluateDayResponse['data']>>(
      '/planning-policy/robustness/evaluate-day',
      data
    );
    return handleResponse(response);
  },

  /**
   * 只生成候选方案
   * POST /planning-policy/what-if/generate-candidates
   */
  generateCandidates: async (
    data: GenerateCandidatesRequest
  ): Promise<GenerateCandidatesResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<GenerateCandidatesResponse['data']>>(
      '/planning-policy/what-if/generate-candidates',
      data
    );
    return handleResponse(response);
  },

  /**
   * 评估候选方案
   * POST /planning-policy/what-if/evaluate-candidates
   */
  evaluateCandidates: async (
    data: EvaluateCandidatesRequest
  ): Promise<EvaluateCandidatesResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<EvaluateCandidatesResponse['data']>>(
      '/planning-policy/what-if/evaluate-candidates',
      data
    );
    return handleResponse(response);
  },

  /**
   * What-If 评估（完整接口）
   * POST /planning-policy/what-if/evaluate
   */
  whatIfEvaluate: async (data: WhatIfEvaluateRequest): Promise<WhatIfEvaluateResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<WhatIfEvaluateResponse['data']>>(
      '/planning-policy/what-if/evaluate',
      data
    );
    return handleResponse(response);
  },

  /**
   * 应用候选方案
   * POST /planning-policy/what-if/apply
   */
  applyCandidate: async (data: ApplyCandidateRequest): Promise<ApplyCandidateResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<ApplyCandidateResponse['data']>>(
      '/planning-policy/what-if/apply',
      data
    );
    return handleResponse(response);
  },

  /**
   * 一键复评
   * POST /planning-policy/what-if/re-evaluate
   */
  reEvaluate: async (data: ReEvaluateRequest): Promise<ReEvaluateResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<ReEvaluateResponse['data']>>(
      '/planning-policy/what-if/re-evaluate',
      data
    );
    return handleResponse(response);
  },
};

