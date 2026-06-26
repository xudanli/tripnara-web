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
  OpsOperationalPolicyConfigV1,
  RecordRealityOutcomeRequest,
  RecordRealityOutcomeResult,
  OpsRealityByTripData,
  OpsRealityReplayCompareData,
  DecisionEngineHealthData,
  CausalOutcomeRequest,
  CausalOutcomeResponseData,
} from '@/types/decision-engine';
import type { AdjustPacingRequest, AdjustPacingResponse } from '@/types/strategy';
import type { ReplaceNodesRequest, ReplaceNodesResponse } from '@/types/strategy';
import {
  enrichRecordRealityOutcomeRequest,
  extractTripWorldStateFromGeneratePlanRequest,
  saveCausalRuntimeSession,
} from '@/lib/causal-runtime-session';

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

/** Ops-reality outcome：body 与 x-trip-run-id / x-execution-trace-id / x-request-id 优先级见对齐清单 */
export type OpsRealityOutcomeTraceHeaders = {
  tripRunId?: string;
  executionTraceId?: string;
  requestId?: string;
};

function buildOpsTraceHeaders(opts?: OpsRealityOutcomeTraceHeaders): Record<string, string> | undefined {
  if (!opts) return undefined;
  const h: Record<string, string> = {};
  if (opts.tripRunId) h['x-trip-run-id'] = opts.tripRunId;
  if (opts.executionTraceId) h['x-execution-trace-id'] = opts.executionTraceId;
  if (opts.requestId) h['x-request-id'] = opts.requestId;
  return Object.keys(h).length ? h : undefined;
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

/** generate-plan + 自动写入因果会话缓存（推荐 C 端调用） */
export async function generatePlanWithCausalCache(
  data: GeneratePlanRequest
): Promise<GeneratePlanResponseData> {
  const result = await generatePlan(data);
  const tripId = typeof data.tripId === 'string' ? data.tripId : undefined;
  if (tripId && result.lastDecisionCausalityId) {
    saveCausalRuntimeSession(
      tripId,
      extractTripWorldStateFromGeneratePlanRequest(data),
      result,
    );
  }
  return result;
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

/** repair-plan + 自动写入因果会话缓存 */
export async function repairPlanWithCausalCache(
  data: RepairPlanRequest
): Promise<RepairPlanResponseData> {
  const result = await repairPlan(data);
  const tripId = typeof data.tripId === 'string' ? data.tripId : undefined;
  if (tripId && result.lastDecisionCausalityId) {
    saveCausalRuntimeSession(
      tripId,
      extractTripWorldStateFromGeneratePlanRequest(data),
      result,
    );
  }
  return result;
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

/** 服务可用性检查（data.capabilities 等） */
export async function health(): Promise<DecisionEngineHealthData> {
  const response = await apiClient.get<DecisionEngineApiResponse<DecisionEngineHealthData>>(
    `${BASE_PATH}/health`
  );
  return handleResponse(response);
}

/**
 * P-OPS-3：当前生效营运策略 JSON
 */
export async function getOperationalPolicy(): Promise<OpsOperationalPolicyConfigV1> {
  const response = await apiClient.get<DecisionEngineApiResponse<OpsOperationalPolicyConfigV1>>(
    `${BASE_PATH}/operational-policy`
  );
  return handleResponse(response);
}

/** 回填 ops reality outcome（首次；P5 可自动触发因果闭环） */
export async function postOpsRealityOutcome(
  snapshotId: string,
  body: RecordRealityOutcomeRequest,
  traceHeaders?: OpsRealityOutcomeTraceHeaders
): Promise<RecordRealityOutcomeResult> {
  const headers = buildOpsTraceHeaders(traceHeaders);
  const response = await apiClient.post<DecisionEngineApiResponse<RecordRealityOutcomeResult>>(
    `${BASE_PATH}/ops-reality-audit/${encodeURIComponent(snapshotId)}/outcome`,
    body,
    headers ? { headers } : undefined
  );
  return handleResponse(response);
}

/** P5：显式因果反事实闭环 */
export async function postCausalOutcome(
  body: CausalOutcomeRequest
): Promise<CausalOutcomeResponseData> {
  const response = await apiClient.post<DecisionEngineApiResponse<CausalOutcomeResponseData>>(
    `${BASE_PATH}/causal-outcome`,
    body,
    { timeout: 60000 }
  );
  return handleResponse(response);
}

/** OPS outcome + 自动补齐 session 缓存的 state / causality_id */
export async function postOpsRealityOutcomeWithCausalContext(
  snapshotId: string,
  body: RecordRealityOutcomeRequest,
  traceHeaders?: OpsRealityOutcomeTraceHeaders
): Promise<RecordRealityOutcomeResult> {
  const tripId = body.tripId ?? body.trip_run_id;
  const enriched =
    tripId && (!body.state || !body.causality_id)
      ? enrichRecordRealityOutcomeRequest(body, tripId)
      : body;
  return postOpsRealityOutcome(snapshotId, enriched, traceHeaders);
}

/** 按 trip 列最近快照（默认最多 20 条，无分页参数） */
export async function getOpsRealityByTrip(tripId: string): Promise<OpsRealityByTripData> {
  const response = await apiClient.get<DecisionEngineApiResponse<OpsRealityByTripData>>(
    `${BASE_PATH}/ops-reality-audit/by-trip/${encodeURIComponent(tripId)}`
  );
  return handleResponse(response);
}

/** 预测 vs 观测指纹比对 */
export async function getOpsRealityReplayCompare(
  snapshotId: string
): Promise<OpsRealityReplayCompareData> {
  const response = await apiClient.get<DecisionEngineApiResponse<OpsRealityReplayCompareData>>(
    `${BASE_PATH}/ops-reality-audit/${encodeURIComponent(snapshotId)}/replay-compare`
  );
  return handleResponse(response);
}

/**
 * 统一导出对象（便于按需导入）
 */
export const decisionEngineApi = {
  generatePlan,
  generatePlanWithCausalCache,
  repairPlan,
  repairPlanWithCausalCache,
  validateSafety,
  checkConstraints,
  generateMultiplePlans,
  explainPlan,
  adjustPacing,
  replaceNodes,
  health,
  getOperationalPolicy,
  postOpsRealityOutcome,
  postOpsRealityOutcomeWithCausalContext,
  postCausalOutcome,
  getOpsRealityByTrip,
  getOpsRealityReplayCompare,
};
