/**
 * Planning Assistant V2 - 推荐接口
 * 
 * 接口文档: /api/agent/planning-assistant/v2/recommendations
 */

import planningAssistantV2Client from './client';
import type {
  RecommendationParams,
  RecommendationsResponse,
} from './types';

export const recommendationsApi = {
  /**
   * 获取目的地推荐
   * GET /recommendations
   * 
   * 说明: 获取目的地推荐，支持自然语言参数和结构化参数。
   * 
   * 认证: ✅ 公开接口，无需认证
   * 速率限制: 20 次/分钟
   */
  getRecommendations: async (
    params: RecommendationParams
  ): Promise<RecommendationsResponse> => {
    const response = await planningAssistantV2Client.get<RecommendationsResponse>(
      '/recommendations',
      { params }
    );
    return response.data;
  },
};
