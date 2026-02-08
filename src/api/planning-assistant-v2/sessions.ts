/**
 * Planning Assistant V2 - 会话管理接口
 * 
 * 接口文档: /api/agent/planning-assistant/v2/sessions
 */

import planningAssistantV2Client from './client';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SessionState,
  ChatHistoryResponse,
} from './types';

export const sessionsApi = {
  /**
   * 创建会话
   * POST /sessions
   * 
   * 认证: ✅ 公开接口，无需认证
   * 速率限制: 10 次/分钟
   */
  create: async (data: CreateSessionRequest): Promise<CreateSessionResponse> => {
    const response = await planningAssistantV2Client.post<CreateSessionResponse>(
      '/sessions',
      data
    );
    return response.data;
  },

  /**
   * 获取会话状态
   * GET /sessions/:sessionId
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证
   * 速率限制: 100 次/分钟
   */
  getState: async (sessionId: string): Promise<SessionState> => {
    const response = await planningAssistantV2Client.get<SessionState>(
      `/sessions/${sessionId}`
    );
    return response.data;
  },

  /**
   * 删除会话
   * DELETE /sessions/:sessionId
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证
   * 速率限制: 10 次/分钟
   */
  delete: async (sessionId: string): Promise<{ success: boolean; sessionId: string }> => {
    const response = await planningAssistantV2Client.delete<{ success: boolean; sessionId: string }>(
      `/sessions/${sessionId}`
    );
    return response.data;
  },

  /**
   * 获取对话历史
   * GET /sessions/:sessionId/history
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证
   * 速率限制: 60 次/分钟
   */
  getHistory: async (
    sessionId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ChatHistoryResponse> => {
    const response = await planningAssistantV2Client.get<ChatHistoryResponse>(
      `/sessions/${sessionId}/history`,
      { params }
    );
    return response.data;
  },
};
