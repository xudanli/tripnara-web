import apiClient from './client';
import type {
  ValidateSafetyRequest,
  ValidateSafetyResponse,
  AdjustPacingRequest,
  AdjustPacingResponse,
  ReplaceNodesRequest,
  ReplaceNodesResponse,
} from '@/types/strategy';
import type {
  DetectConflictsRequest,
  DetectConflictsResponse,
  CheckConstraintsRequest,
  CheckConstraintsResponse,
  GenerateMultiplePlansRequest,
  GenerateMultiplePlansResponse,
} from '@/types/constraints';
import type {
  PlanVariantFeedbackRequest,
  PlanVariantFeedbackResponse,
  ConflictFeedbackRequest,
  ConflictFeedbackResponse,
  DecisionQualityFeedbackRequest,
  DecisionQualityFeedbackResponse,
  BatchFeedbackRequest,
  BatchFeedbackResponse,
  FeedbackStatsQuery,
  FeedbackStatsResponse,
} from '@/types/feedback';

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

  /**
   * 检测约束冲突
   * POST /decision/detect-conflicts
   */
  detectConflicts: async (
    data: DetectConflictsRequest
  ): Promise<DetectConflictsResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<DetectConflictsResponse['data']>>(
      '/decision/detect-conflicts',
      data
    );
    return handleResponse(response);
  },

  /**
   * 检查约束并获取不可行性解释
   * POST /decision/check-constraints-with-explanation
   */
  checkConstraintsWithExplanation: async (
    data: CheckConstraintsRequest
  ): Promise<CheckConstraintsResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<CheckConstraintsResponse['data']>>(
      '/decision/check-constraints-with-explanation',
      data,
      {
        timeout: 60000, // 60秒超时
      }
    );
    return handleResponse(response);
  },

  /**
   * 生成多个方案变体
   * POST /decision/generate-multiple-plans
   */
  generateMultiplePlans: async (
    data: GenerateMultiplePlansRequest
  ): Promise<GenerateMultiplePlansResponse['data']> => {
    const response = await apiClient.post<ApiResponseWrapper<GenerateMultiplePlansResponse['data']>>(
      '/decision/generate-multiple-plans',
      data,
      {
        timeout: 120000, // 120秒超时（方案生成可能需要较长时间）
      }
    );
    return handleResponse(response);
  },

  /**
   * 提交计划变体反馈
   * POST /decision/feedback/plan-variant
   */
  submitPlanVariantFeedback: async (
    data: PlanVariantFeedbackRequest
  ): Promise<PlanVariantFeedbackResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<PlanVariantFeedbackResponse>>(
      '/decision/feedback/plan-variant',
      data
    );
    return handleResponse(response);
  },

  /**
   * 提交约束冲突反馈
   * POST /decision/feedback/conflict
   */
  submitConflictFeedback: async (
    data: ConflictFeedbackRequest
  ): Promise<ConflictFeedbackResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<ConflictFeedbackResponse>>(
      '/decision/feedback/conflict',
      data
    );
    return handleResponse(response);
  },

  /**
   * 提交决策质量反馈
   * POST /decision/feedback/decision-quality
   */
  submitDecisionQualityFeedback: async (
    data: DecisionQualityFeedbackRequest
  ): Promise<DecisionQualityFeedbackResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<DecisionQualityFeedbackResponse>>(
      '/decision/feedback/decision-quality',
      data
    );
    return handleResponse(response);
  },

  /**
   * 批量提交反馈
   * POST /decision/feedback/batch
   */
  submitBatchFeedback: async (
    data: BatchFeedbackRequest
  ): Promise<BatchFeedbackResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<BatchFeedbackResponse>>(
      '/decision/feedback/batch',
      data
    );
    return handleResponse(response);
  },

  /**
   * 获取反馈统计
   * GET /decision/feedback/stats
   */
  getFeedbackStats: async (
    params?: FeedbackStatsQuery
  ): Promise<FeedbackStatsResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<FeedbackStatsResponse>>(
      '/decision/feedback/stats',
      { params }
    );
    return handleResponse(response);
  },
};

