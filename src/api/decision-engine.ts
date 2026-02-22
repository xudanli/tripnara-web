/**
 * 决策引擎 API 客户端
 * 对应 PRD: docs/api/decision-engine-prd.md
 * 路径前缀: /decision-engine/v1
 */

import apiClient from './client';
import type {
  GeneratePlanRequest,
  GeneratePlanResponseData,
  RepairPlanRequest,
  RepairPlanResponseData,
  ValidateSafetyRequest,
  ValidateSafetyResponseData,
  CheckConstraintsRequest,
  CheckConstraintsResponseData,
  GenerateMultiplePlansRequest,
  GenerateMultiplePlansResponseData,
  ExplainPlanRequest,
  ExplainPlanResponseData,
  DecisionEngineApiResponse,
} from '@/types/decision-engine';
import type { AdjustPacingRequest, AdjustPacingResponse } from '@/types/strategy';
import type { ReplaceNodesRequest, ReplaceNodesResponse } from '@/types/strategy';

const BASE_PATH = '/decision-engine/v1';

// 辅助函数：处理 API 响应
function handleResponse<T>(response: { data: DecisionEngineApiResponse<T> }): T {
  if (!response?.data) {
    throw new Error('无效的API响应');
  }
  if (!response.data.success) {
    const err = (response.data as any).error;
    throw new Error(err?.message || '请求失败');
  }
  return (response.data as { success: true; data: T }).data;
}

/**
 * P0 核心接口
 */

/** 根据世界状态生成行程计划 */
export async function generatePlan(
  data: GeneratePlanRequest
): Promise<GeneratePlanResponseData> {
  const response = await apiClient.post<DecisionEngineApiResponse<GeneratePlanResponseData>>(
    `${BASE_PATH}/generate-plan`,
    data,
    { timeout: 60000 }
  );
  return handleResponse(response);
}

/** 天气/闭馆等变化时最小改动修复计划 */
export async function repairPlan(
  data: RepairPlanRequest
): Promise<RepairPlanResponseData> {
  const response = await apiClient.post<DecisionEngineApiResponse<RepairPlanResponseData>>(
    `${BASE_PATH}/repair-plan`,
    data,
    { timeout: 60000 }
  );
  return handleResponse(response);
}

/** Abu 策略校验物理安全 */
export async function validateSafety(
  data: ValidateSafetyRequest
): Promise<ValidateSafetyResponseData> {
  const response = await apiClient.post<DecisionEngineApiResponse<ValidateSafetyResponseData>>(
    `${BASE_PATH}/validate-safety`,
    data
  );
  return handleResponse(response);
}

/** 检查计划是否满足约束 */
export async function checkConstraints(
  data: CheckConstraintsRequest
): Promise<CheckConstraintsResponseData> {
  const response = await apiClient.post<DecisionEngineApiResponse<CheckConstraintsResponseData>>(
    `${BASE_PATH}/check-constraints`,
    data,
    { timeout: 60000 }
  );
  return handleResponse(response);
}

/**
 * P1 增强接口
 */

/** 生成 2–N 个不同权衡方案 */
export async function generateMultiplePlans(
  data: GenerateMultiplePlansRequest
): Promise<GenerateMultiplePlansResponseData> {
  const response = await apiClient.post<
    DecisionEngineApiResponse<GenerateMultiplePlansResponseData>
  >(`${BASE_PATH}/generate-multiple-plans`, data, {
    timeout: 120000,
  });
  return handleResponse(response);
}

/** 返回计划的可解释 UI 数据 */
export async function explainPlan(
  data: ExplainPlanRequest
): Promise<ExplainPlanResponseData> {
  const response = await apiClient.post<DecisionEngineApiResponse<ExplainPlanResponseData>>(
    `${BASE_PATH}/explain-plan`,
    data
  );
  return handleResponse(response);
}

/**
 * P2 辅助接口
 */

/** Dr.Dre 节奏调整 */
export async function adjustPacing(
  data: AdjustPacingRequest
): Promise<AdjustPacingResponse['data']> {
  const response = await apiClient.post<
    DecisionEngineApiResponse<AdjustPacingResponse['data']>
  >(`${BASE_PATH}/adjust-pacing`, data);
  return handleResponse(response);
}

/** Neptune 节点替换 */
export async function replaceNodes(
  data: ReplaceNodesRequest
): Promise<ReplaceNodesResponse['data']> {
  const response = await apiClient.post<
    DecisionEngineApiResponse<ReplaceNodesResponse['data']>
  >(`${BASE_PATH}/replace-nodes`, data);
  return handleResponse(response);
}

/** 服务可用性检查 */
export async function health(): Promise<{ status: string; [key: string]: unknown }> {
  const response = await apiClient.get<
    DecisionEngineApiResponse<{ status: string; [key: string]: unknown }>
  >(`${BASE_PATH}/health`);
  return handleResponse(response);
}

/**
 * 统一导出对象（便于按需导入）
 */
export const decisionEngineApi = {
  generatePlan,
  repairPlan,
  validateSafety,
  checkConstraints,
  generateMultiplePlans,
  explainPlan,
  adjustPacing,
  replaceNodes,
  health,
};
