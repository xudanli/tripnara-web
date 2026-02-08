/**
 * Planning Assistant V2 - 方案接口
 * 
 * 接口文档: /api/agent/planning-assistant/v2/plans
 */

import planningAssistantV2Client from './client';
import type {
  GeneratePlanRequest,
  GeneratePlanResponse,
  AsyncTaskResponse,
  TaskStatusResponse,
  ComparePlansParams,
  ComparePlansResponse,
  OptimizePlanRequest,
  ConfirmPlanRequest,
  ConfirmPlanResponse,
} from './types';

export const plansApi = {
  /**
   * 同步生成方案
   * POST /plans/generate
   * 
   * 说明: 同步生成旅行方案，返回生成的方案列表。
   * 
   * 认证: 🔒 需要认证
   * 速率限制: 10 次/分钟
   */
  generate: async (data: GeneratePlanRequest): Promise<GeneratePlanResponse> => {
    const response = await planningAssistantV2Client.post<GeneratePlanResponse>(
      '/plans/generate',
      data
    );
    return response.data;
  },

  /**
   * 异步生成方案
   * POST /plans/generate-async
   * 
   * 说明: 异步生成旅行方案，返回任务ID，可通过任务ID查询生成状态。
   * 
   * 认证: 🔒 需要认证
   * 速率限制: 20 次/分钟
   */
  generateAsync: async (data: GeneratePlanRequest): Promise<AsyncTaskResponse> => {
    const response = await planningAssistantV2Client.post<AsyncTaskResponse>(
      '/plans/generate-async',
      data
    );
    return response.data;
  },

  /**
   * 查询生成任务状态
   * GET /plans/generate/:taskId
   * 
   * 说明: 查询异步生成任务的状态和结果。
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证
   * 速率限制: 60 次/分钟
   */
  getTaskStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    const response = await planningAssistantV2Client.get<TaskStatusResponse>(
      `/plans/generate/${taskId}`
    );
    return response.data;
  },

  /**
   * 对比方案
   * GET /plans/compare
   * 
   * 说明: 对比多个方案的差异。
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证（通过 sessionId）
   * 速率限制: 20 次/分钟
   */
  compare: async (params: ComparePlansParams): Promise<ComparePlansResponse> => {
    const response = await planningAssistantV2Client.get<ComparePlansResponse>(
      '/plans/compare',
      { params }
    );
    return response.data;
  },

  /**
   * 优化方案
   * POST /plans/:planId/optimize
   * 
   * 说明: 优化现有方案，根据优化要求调整方案参数。
   * 
   * 认证: 🔒 需要认证 + 资源所有权验证（通过 sessionId）
   * 速率限制: 10 次/分钟
   */
  optimize: async (
    planId: string,
    data: OptimizePlanRequest
  ): Promise<GeneratePlanResponse> => {
    const response = await planningAssistantV2Client.post<GeneratePlanResponse>(
      `/plans/${planId}/optimize`,
      data
    );
    return response.data;
  },

  /**
   * 确认方案
   * POST /plans/:planId/confirm
   * 
   * 说明: 确认方案并创建行程。
   * 
   * 认证: 🔒 需要认证
   * 速率限制: 10 次/分钟
   */
  confirm: async (
    planId: string,
    data: ConfirmPlanRequest
  ): Promise<ConfirmPlanResponse> => {
    const response = await planningAssistantV2Client.post<ConfirmPlanResponse>(
      `/plans/${planId}/confirm`,
      data
    );
    return response.data;
  },
};
