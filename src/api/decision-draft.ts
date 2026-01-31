/**
 * 决策草案用户端 API
 * 用于 TripNARA 可视化决策编排工具
 */

import apiClient from './client';
import type {
  DecisionDraft,
  DecisionExplanation,
  DecisionStep,
  ImpactPreviewResult,
  DecisionReplay,
  DecisionDraftVersion,
  VersionDiff,
  UpdateDecisionStepRequest,
  PreviewImpactRequest,
  GetDecisionDraftResponse,
  GetExplanationResponse,
  UpdateStepResponse,
  PreviewImpactResponse,
  GetReplayResponse,
  GetVersionsResponse,
  GetVersionDetailResponse,
  GetVersionCompareResponse,
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

    console.error('[Decision Draft API] 请求失败:', {
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

// 开发环境Mock支持
const USE_MOCK_API = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DECISION_DRAFT === 'true';

export const decisionDraftApi = {
  /**
   * 获取决策草案
   * GET /api/decision-draft/:draftId
   */
  getDecisionDraft: async (draftId: string, userMode: UserMode = 'toc'): Promise<DecisionDraft> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.getDecisionDraft(draftId, userMode);
    }

    const response = await apiClient.get<ApiResponseWrapper<GetDecisionDraftResponse>>(
      `/decision-draft/${draftId}`,
      {
        params: { mode: userMode },
      }
    );
    const result = handleResponse(response);
    return result.draft;
  },

  /**
   * 获取决策解释
   * GET /api/decision-draft/:draftId/explanation?mode=toc|expert|studio
   */
  getExplanation: async (
    draftId: string,
    mode: UserMode = 'toc',
    stepId?: string
  ): Promise<DecisionExplanation> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.getExplanation(draftId, mode, stepId);
    }

    const response = await apiClient.get<ApiResponseWrapper<GetExplanationResponse>>(
      `/decision-draft/${draftId}/explanation`,
      {
        params: { mode },
      }
    );
    const result = handleResponse(response);
    return result.explanation;
  },

  /**
   * 获取步骤解释
   * GET /api/decision-draft/:draftId/step/:stepId/explanation
   */
  getStepExplanation: async (
    draftId: string,
    stepId: string,
    userMode: UserMode = 'toc'
  ): Promise<DecisionExplanation> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.getStepExplanation(draftId, stepId);
    }

    const response = await apiClient.get<ApiResponseWrapper<GetExplanationResponse>>(
      `/decision-draft/${draftId}/step/${stepId}/explanation`,
      {
        params: { mode: userMode },
      }
    );
    const result = handleResponse(response);
    return result.explanation;
  },

  /**
   * 修改决策步骤
   * PATCH /api/decision-draft/:draftId/steps/:stepId
   */
  updateStep: async (
    draftId: string,
    stepId: string,
    updates: UpdateDecisionStepRequest
  ): Promise<DecisionStep> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.updateStep(draftId, stepId, updates);
    }

    const response = await apiClient.patch<ApiResponseWrapper<UpdateStepResponse>>(
      `/decision-draft/${draftId}/steps/${stepId}`,
      updates
    );
    const result = handleResponse(response);
    return result.step;
  },

  /**
   * 预览影响
   * POST /api/decision-draft/:draftId/preview-impact
   */
  previewImpact: async (
    draftId: string,
    request: PreviewImpactRequest
  ): Promise<ImpactPreviewResult> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.previewImpact(draftId, request);
    }

    const response = await apiClient.post<ApiResponseWrapper<PreviewImpactResponse>>(
      `/decision-draft/${draftId}/preview-impact`,
      request
    );
    const result = handleResponse(response);
    return result.impact;
  },

  /**
   * 决策回放
   * GET /api/decision-draft/:draftId/replay
   */
  getReplay: async (draftId: string): Promise<DecisionReplay> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.getReplay(draftId);
    }

    const response = await apiClient.get<ApiResponseWrapper<GetReplayResponse>>(
      `/decision-draft/${draftId}/replay`
    );
    const result = handleResponse(response);
    return result.replay;
  },

  /**
   * 获取版本列表
   * GET /api/decision-draft/:draftId/versions
   */
  getVersions: async (draftId: string): Promise<DecisionDraftVersion[]> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.getVersions(draftId);
    }

    const response = await apiClient.get<ApiResponseWrapper<GetVersionsResponse>>(
      `/decision-draft/${draftId}/versions`
    );
    const result = handleResponse(response);
    return result.versions;
  },

  /**
   * 获取版本详情
   * GET /api/decision-draft/:draftId/versions/:versionId
   */
  getVersionDetail: async (
    draftId: string,
    versionId: string
  ): Promise<DecisionDraftVersion> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.getVersionDetail(draftId, versionId);
    }

    const response = await apiClient.get<ApiResponseWrapper<GetVersionDetailResponse>>(
      `/decision-draft/${draftId}/versions/${versionId}`
    );
    const result = handleResponse(response);
    return result.version;
  },

  /**
   * 版本对比
   * GET /api/decision-draft/:draftId/versions/:versionId1/compare/:versionId2
   */
  compareVersions: async (
    draftId: string,
    versionId1: string,
    versionId2: string
  ): Promise<{ version1: DecisionDraftVersion; version2: DecisionDraftVersion; diff: VersionDiff }> => {
    // 开发环境Mock支持
    if (USE_MOCK_API) {
      const { mockDecisionDraftApi } = await import('@/utils/mock-decision-draft-api');
      return mockDecisionDraftApi.compareVersions(draftId, versionId1, versionId2);
    }

    const response = await apiClient.get<ApiResponseWrapper<GetVersionCompareResponse>>(
      `/decision-draft/${draftId}/versions/${versionId1}/compare/${versionId2}`
    );
    const result = handleResponse(response);
    return {
      version1: result.version1,
      version2: result.version2,
      diff: result.diff,
    };
  },
};
