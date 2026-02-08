/**
 * Planning Assistant V2 - 对话接口
 * 
 * 接口文档: /api/agent/planning-assistant/v2/chat
 */

import planningAssistantV2Client from './client';
import type { ChatRequest, ChatResponse } from './types';

export const chatApi = {
  /**
   * 智能对话
   * POST /chat
   * 
   * 说明: 智能对话接口，支持自然语言理解、多轮对话、上下文感知和智能路由。
   * 这是**主要入口**，推荐优先使用。
   * 
   * 认证: ✅ 公开接口，无需认证（但建议提供 userId）
   * 速率限制: 30 次/分钟
   */
  sendMessage: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await planningAssistantV2Client.post<ChatResponse>(
      '/chat',
      data
    );
    return response.data;
  },
};
