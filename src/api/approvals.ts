import apiClient from './client';
import type {
  ApprovalRequest,
  HandleDecisionRequest,
  HandleDecisionResponse,
  CancelApprovalRequest,
  CancelApprovalResponse,
  ResumeAgentResponse,
} from '@/types/approval';

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

export const approvalsApi = {
  /**
   * 获取审批请求详情
   * GET /api/approvals/:id
   * 
   * @param id 审批请求 ID（UUID）
   * @returns 审批请求详情
   */
  getApproval: async (id: string): Promise<ApprovalRequest> => {
    const response = await apiClient.get<ApiResponseWrapper<ApprovalRequest>>(
      `/approvals/${id}`
    );
    return handleResponse(response);
  },

  /**
   * 获取会话的所有待审批请求
   * GET /api/approvals/thread/:threadId/pending
   * 
   * @param threadId 会话/线程 ID
   * @returns 待审批请求数组
   */
  getPendingApprovals: async (threadId: string): Promise<ApprovalRequest[]> => {
    const response = await apiClient.get<ApiResponseWrapper<ApprovalRequest[]>>(
      `/approvals/thread/${threadId}/pending`
    );
    return handleResponse(response);
  },

  /**
   * 处理审批（批准或拒绝）⭐ 核心接口
   * POST /api/approvals/:id/decision
   * 
   * @param id 审批请求 ID
   * @param request 审批决策请求
   * @returns 处理审批响应
   */
  handleDecision: async (
    id: string,
    request: HandleDecisionRequest
  ): Promise<HandleDecisionResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<HandleDecisionResponse>>(
      `/approvals/${id}/decision`,
      request
    );
    return handleResponse(response);
  },

  /**
   * 取消审批请求
   * POST /api/approvals/:id/cancel
   * 
   * @param id 审批请求 ID
   * @param reason 取消原因（可选）
   * @returns 取消审批响应
   */
  cancelApproval: async (
    id: string,
    reason?: string
  ): Promise<CancelApprovalResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<CancelApprovalResponse>>(
      `/approvals/${id}/cancel`,
      { reason } as CancelApprovalRequest
    );
    return handleResponse(response);
  },

  /**
   * 手动触发 Agent 恢复
   * POST /api/approvals/:id/resume-agent
   * 
   * @param id 审批请求 ID
   * @returns 恢复 Agent 响应
   */
  resumeAgent: async (id: string): Promise<ResumeAgentResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<ResumeAgentResponse>>(
      `/approvals/${id}/resume-agent`
    );
    return handleResponse(response);
  },
};
