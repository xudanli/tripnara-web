/**
 * Planning Assistant V2 - 行程接口
 * 
 * 接口文档: /api/agent/planning-assistant/v2/trips
 */

import planningAssistantV2Client from './client';
import type {
  OptimizeTripRequest,
  RefineTripRequest,
  TripOperationResponse,
  SuggestionsResponse,
} from './types';

export const tripsApi = {
  /**
   * 优化已创建行程
   * POST /trips/:tripId/optimize
   * 
   * 说明: 优化已创建的行程，调整预算、节奏等。
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证
   * 速率限制: 10 次/分钟
   */
  optimize: async (
    tripId: string,
    data: OptimizeTripRequest
  ): Promise<TripOperationResponse> => {
    const response = await planningAssistantV2Client.post<TripOperationResponse>(
      `/trips/${tripId}/optimize`,
      data
    );
    return response.data;
  },

  /**
   * 细化行程
   * POST /trips/:tripId/refine
   * 
   * 说明: 细化行程，安排每日具体活动、餐厅、交通。
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证
   * 速率限制: 10 次/分钟
   */
  refine: async (
    tripId: string,
    data: RefineTripRequest
  ): Promise<TripOperationResponse> => {
    const response = await planningAssistantV2Client.post<TripOperationResponse>(
      `/trips/${tripId}/refine`,
      data
    );
    return response.data;
  },

  /**
   * 获取优化建议
   * GET /trips/:tripId/suggestions
   * 
   * 说明: 获取行程的优化建议。
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证
   * 速率限制: 30 次/分钟
   */
  getSuggestions: async (tripId: string): Promise<SuggestionsResponse> => {
    const response = await planningAssistantV2Client.get<SuggestionsResponse>(
      `/trips/${tripId}/suggestions`
    );
    return response.data;
  },
};
