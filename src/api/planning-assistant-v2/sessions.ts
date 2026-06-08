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

function readSessionIdFromPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const nested =
    o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : null;
  for (const src of [o, nested]) {
    if (!src) continue;
    for (const key of ['sessionId', 'session_id'] as const) {
      const v = src[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

export const sessionsApi = {
  /**
   * 创建会话
   * POST /sessions
   * 
   * 认证: ✅ 公开接口，无需认证
   * 速率限制: 10 次/分钟
   */
  create: async (data: CreateSessionRequest): Promise<CreateSessionResponse> => {
    const response = await planningAssistantV2Client.post<unknown>('/sessions', data);
    const sessionId = readSessionIdFromPayload(response.data);
    if (!sessionId) {
      throw new Error('Create session response missing sessionId');
    }
    return { sessionId };
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
