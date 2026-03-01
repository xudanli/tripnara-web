import apiClient from './client';
import type {
  CreateDecisionRequest,
  CreateDecisionResponse,
  DecisionDetail,
  SelectPlanRequest,
  SelectPlanResponse,
  DecisionFeedbackRequest,
  DecisionFeedbackResponse,
  PreferenceFeedbackRequest,
  DetailedExplanation,
  NaturalLanguageExplanation,
  DecisionHistoryQuery,
  DecisionHistoryResponse,
  LearningProgress,
  SelectedPlan,
  ExplanationDetailLevel,
  ExplanationLanguage,
} from '@/types/decision-engine';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  
  if (!response.data.success) {
    const errorData = response.data.error;
    const errorMessage = errorData?.message || errorData?.code || '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[Decisions API] 请求失败:', {
      code: errorCode,
      message: errorMessage,
      details: errorData?.details,
    });
    
    const error = new Error(errorMessage) as Error & {
      code?: string;
      details?: unknown;
    };
    error.code = errorCode;
    if (errorData?.details) {
      error.details = errorData.details;
    }
    
    throw error;
  }
  
  if (response.data.data === undefined || response.data.data === null) {
    throw new Error('API响应数据为空');
  }
  
  return response.data.data;
}

export const decisionsApi = {
  /**
   * 创建决策请求
   */
  create: async (data: CreateDecisionRequest): Promise<CreateDecisionResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CreateDecisionResponse>>(
      '/v1/decisions',
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取决策详情
   */
  getById: async (decisionId: string): Promise<DecisionDetail> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionDetail>>(
      `/v1/decisions/${decisionId}`
    );
    return handleResponse(response);
  },

  /**
   * 获取备选方案详情
   */
  getAlternative: async (decisionId: string, planId: string): Promise<SelectedPlan> => {
    const response = await apiClient.get<ApiResponseWrapper<SelectedPlan>>(
      `/v1/decisions/${decisionId}/alternatives/${planId}`
    );
    return handleResponse(response);
  },

  /**
   * 切换选择方案
   */
  selectPlan: async (decisionId: string, data: SelectPlanRequest): Promise<SelectPlanResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<SelectPlanResponse>>(
      `/v1/decisions/${decisionId}/select`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 提交决策反馈
   */
  submitFeedback: async (
    decisionId: string,
    data: DecisionFeedbackRequest
  ): Promise<DecisionFeedbackResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<DecisionFeedbackResponse>>(
      `/v1/decisions/${decisionId}/feedback`,
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取决策解释
   */
  getExplanation: async (
    decisionId: string,
    options?: {
      language?: ExplanationLanguage;
      detailLevel?: ExplanationDetailLevel;
    }
  ): Promise<DetailedExplanation> => {
    const response = await apiClient.get<ApiResponseWrapper<DetailedExplanation>>(
      `/v1/decisions/${decisionId}/explanation`,
      { params: options }
    );
    return handleResponse(response);
  },

  /**
   * 获取自然语言解释
   */
  getNaturalExplanation: async (
    decisionId: string,
    language?: ExplanationLanguage
  ): Promise<NaturalLanguageExplanation> => {
    const response = await apiClient.get<ApiResponseWrapper<NaturalLanguageExplanation>>(
      `/v1/decisions/${decisionId}/explanation/natural`,
      { params: { language } }
    );
    return handleResponse(response);
  },
};

export const userDecisionsApi = {
  /**
   * 获取决策历史
   */
  getHistory: async (query?: DecisionHistoryQuery): Promise<DecisionHistoryResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<DecisionHistoryResponse>>(
      '/v1/users/me/decisions',
      { params: query }
    );
    return handleResponse(response);
  },

  /**
   * 获取学习进度
   */
  getLearningProgress: async (): Promise<LearningProgress> => {
    const response = await apiClient.get<ApiResponseWrapper<LearningProgress>>(
      '/v1/users/me/learning-progress'
    );
    return handleResponse(response);
  },

  /**
   * 提交偏好反馈（隐式）
   */
  submitPreferenceFeedback: async (data: PreferenceFeedbackRequest): Promise<void> => {
    const response = await apiClient.post<ApiResponseWrapper<void>>(
      '/v1/users/me/preferences/feedback',
      data
    );
    handleResponse(response);
  },
};
