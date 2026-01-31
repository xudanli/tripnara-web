/**
 * 决策草案管理端 API
 * 用于 TripNARA 可视化决策编排工具（Studio/Ops模式）
 */

import apiClient from './client';
import type {
  DecisionDraft,
  DecisionStep,
  DecisionDebugInfo,
  UpdateDecisionStepRequest,
  BatchUpdateStepsRequest,
  ReorderStepsRequest,
  CreateVersionRequest,
  GenerateDecisionDraftRequest,
  GetDecisionDraftResponse,
  GetDebugInfoResponse,
  GetStatsResponse,
  UpdateStepResponse,
  GenerateDraftResponse,
  UserMode,
} from '@/types/decision-draft';

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
    const errorData = response.data.error;
    const errorMessage = errorData?.message || errorData?.code || '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';

    console.error('[Decision Draft Admin API] 请求失败:', {
      code: errorCode,
      message: errorMessage,
      details: errorData?.details,
    });

    const error = new Error(errorMessage) as Error & {
      code?: string;
      details?: any;
    };
    error.code = errorCode;
    if (errorData?.details) {
      error.details = errorData.details;
    }

    throw error;
  }

  return response.data.data;
}

export const decisionDraftAdminApi = {
  /**
   * 生成决策草案
   * POST /api/decision-draft/admin/generate
   */
  generateDraft: async (
    request: GenerateDecisionDraftRequest
  ): Promise<DecisionDraft> => {
    const response = await apiClient.post<ApiResponseWrapper<GenerateDraftResponse>>(
      '/decision-draft/admin/generate',
      request
    );
    const result = handleResponse(response);
    return result.draft;
  },

  /**
   * 获取调试信息
   * GET /api/decision-draft/admin/:draftId/debug-info
   */
  getDebugInfo: async (draftId: string): Promise<DecisionDebugInfo> => {
    const response = await apiClient.get<ApiResponseWrapper<GetDebugInfoResponse>>(
      `/decision-draft/admin/${draftId}/debug-info`
    );
    const result = handleResponse(response);
    return result.debug_info;
  },

  /**
   * 获取统计信息
   * GET /api/decision-draft/admin/stats
   */
  getStats: async (): Promise<{
    total_drafts: number;
    total_decisions: number;
    average_confidence: number;
    success_rate: number;
  }> => {
    const response = await apiClient.get<ApiResponseWrapper<GetStatsResponse>>(
      '/decision-draft/admin/stats'
    );
    const result = handleResponse(response);
    return {
      total_drafts: result.total_drafts,
      total_decisions: result.total_decisions,
      average_confidence: result.average_confidence,
      success_rate: result.success_rate,
    };
  },

  /**
   * 编辑步骤
   * PUT /api/decision-draft/admin/:draftId/step/:stepId
   */
  updateStep: async (
    draftId: string,
    stepId: string,
    updates: UpdateDecisionStepRequest
  ): Promise<DecisionStep> => {
    const response = await apiClient.put<ApiResponseWrapper<UpdateStepResponse>>(
      `/decision-draft/admin/${draftId}/step/${stepId}`,
      updates
    );
    const result = handleResponse(response);
    return result.step;
  },

  /**
   * 批量编辑
   * PUT /api/decision-draft/admin/:draftId/steps/batch
   */
  batchUpdateSteps: async (
    draftId: string,
    request: BatchUpdateStepsRequest
  ): Promise<DecisionStep[]> => {
    const response = await apiClient.put<ApiResponseWrapper<{ steps: DecisionStep[] }>>(
      `/decision-draft/admin/${draftId}/steps/batch`,
      request
    );
    const result = handleResponse(response);
    return result.steps;
  },

  /**
   * 局部重算
   * POST /api/decision-draft/admin/:draftId/regenerate
   */
  regenerate: async (
    draftId: string,
    stepIds?: string[]
  ): Promise<DecisionDraft> => {
    const response = await apiClient.post<ApiResponseWrapper<GetDecisionDraftResponse>>(
      `/decision-draft/admin/${draftId}/regenerate`,
      stepIds ? { step_ids: stepIds } : {}
    );
    const result = handleResponse(response);
    return result.draft;
  },

  /**
   * 重新排序
   * PUT /api/decision-draft/admin/:draftId/steps/reorder
   */
  reorderSteps: async (
    draftId: string,
    request: ReorderStepsRequest
  ): Promise<DecisionStep[]> => {
    const response = await apiClient.put<ApiResponseWrapper<{ steps: DecisionStep[] }>>(
      `/decision-draft/admin/${draftId}/steps/reorder`,
      request
    );
    const result = handleResponse(response);
    return result.steps;
  },

  /**
   * 保存版本
   * POST /api/decision-draft/admin/:draftId/version
   */
  createVersion: async (
    draftId: string,
    request?: CreateVersionRequest
  ): Promise<{ version_id: string }> => {
    const response = await apiClient.post<ApiResponseWrapper<{ version_id: string }>>(
      `/decision-draft/admin/${draftId}/version`,
      request || {}
    );
    const result = handleResponse(response);
    return result;
  },

  /**
   * 回滚版本
   * POST /api/decision-draft/admin/:draftId/version/:versionId/rollback
   */
  rollbackVersion: async (
    draftId: string,
    versionId: string
  ): Promise<DecisionDraft> => {
    const response = await apiClient.post<ApiResponseWrapper<GetDecisionDraftResponse>>(
      `/decision-draft/admin/${draftId}/version/${versionId}/rollback`
    );
    const result = handleResponse(response);
    return result.draft;
  },

  /**
   * Fork版本
   * POST /api/decision-draft/admin/:draftId/version/:versionId/fork
   */
  forkVersion: async (
    draftId: string,
    versionId: string
  ): Promise<DecisionDraft> => {
    const response = await apiClient.post<ApiResponseWrapper<GetDecisionDraftResponse>>(
      `/decision-draft/admin/${draftId}/version/${versionId}/fork`
    );
    const result = handleResponse(response);
    return result.draft;
  },
};
