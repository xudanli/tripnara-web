/**
 * 决策引擎 API 类型定义
 * 对应 PRD: docs/api/decision-engine-prd.md
 */

// ==================== 世界状态 ====================

export interface DecisionEngineContext {
  destination: string;
  startDate: string; // ISO date
  durationDays: number;
  preferences?: {
    pace?: 'relaxed' | 'moderate' | 'intense';
    riskTolerance?: 'low' | 'medium' | 'high';
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DecisionEngineState {
  context: DecisionEngineContext;
  candidatesByDate?: Record<string, unknown[]>;
  [key: string]: unknown;
}

// ==================== 计划结构 ====================

export interface PlanDay {
  date?: string;
  slots?: PlanSlot[];
  [key: string]: unknown;
}

export interface PlanSlot {
  id?: string;
  [key: string]: unknown;
}

export interface DecisionEnginePlan {
  version?: string;
  days: PlanDay[];
  [key: string]: unknown;
}

// ==================== 决策日志 ====================

export interface DecisionEngineLog {
  runId?: string;
  explanation?: string;
  strategyMix?: Array<{ persona: string; weight?: number }>;
  [key: string]: unknown;
}

// ==================== 生成计划 ====================

export interface GeneratePlanRequest {
  tripId: string;
  state: DecisionEngineState;
}

export interface GeneratePlanResponseData {
  plan: DecisionEnginePlan;
  log: DecisionEngineLog;
}

// ==================== 修复计划 ====================

export type RepairTrigger = 'weather_update' | 'closure' | 'hazard' | string;

export interface RepairPlanRequest {
  tripId: string;
  state: DecisionEngineState;
  plan: DecisionEnginePlan;
  trigger: RepairTrigger;
}

export interface RepairPlanResponseData {
  plan: DecisionEnginePlan;
  log: DecisionEngineLog;
  triggers?: string[];
  changedSlotIds?: string[];
}

// ==================== 安全校验 ====================

export interface ValidateSafetyRequest {
  tripId: string;
  plan: DecisionEnginePlan;
  worldContext: Record<string, unknown>;
}

export interface SafetyViolationItem {
  code?: string;
  message?: string;
  segmentId?: string;
  [key: string]: unknown;
}

export interface AlternativeRouteItem {
  routeId?: string;
  description: string;
  plan?: DecisionEnginePlan;
  changes?: string[];
  [key: string]: unknown;
}

export interface ValidateSafetyResponseData {
  allowed: boolean;
  violations: SafetyViolationItem[];
  alternativeRoutes?: AlternativeRouteItem[];
}

// ==================== 约束校验 ====================

export interface CheckConstraintsRequest {
  state: DecisionEngineState;
  plan: DecisionEnginePlan;
}

export interface ConstraintViolationItem {
  code?: string;
  severity?: 'error' | 'warning' | 'info';
  message?: string;
  [key: string]: unknown;
}

export interface InfeasibilityExplanation {
  feasible?: boolean;
  reasons?: Array<{ constraint: string; description: string }>;
  summary?: string;
  [key: string]: unknown;
}

export interface CheckConstraintsResponseData {
  feasible: boolean;
  violations: ConstraintViolationItem[];
  infeasibilityExplanation?: InfeasibilityExplanation | null;
}

// ==================== 多方案生成 ====================

export interface GenerateMultiplePlansRequest {
  state: DecisionEngineState;
  constraints?: {
    hard_constraints?: Record<string, unknown>;
    soft_constraints?: Record<string, unknown>;
  };
  count?: number;
}

export interface PlanVariantItem {
  id: string;
  plan: DecisionEnginePlan;
  score?: Record<string, number>;
  tradeoffs?: Array<{ constraint?: string; sacrificed?: string; reason?: string }>;
  [key: string]: unknown;
}

export interface GenerateMultiplePlansResponseData {
  variants: PlanVariantItem[];
  log: DecisionEngineLog;
}

// ==================== 决策解释 ====================

export interface ExplainPlanRequest {
  plan: DecisionEnginePlan;
  log?: DecisionEngineLog;
  violations?: ConstraintViolationItem[];
}

export interface ExplainSlot {
  slotId?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface ExplainPlanResponseData {
  summary: string;
  whyThisPlan: string[];
  slots: ExplainSlot[];
  violations: ConstraintViolationItem[];
}

// ==================== 通用响应包装 ====================

export interface DecisionEngineSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface DecisionEngineErrorResponse {
  success: false;
  error: {
    code: string | number;
    message: string;
    details?: unknown;
  };
}

export type DecisionEngineApiResponse<T> =
  | DecisionEngineSuccessResponse<T>
  | DecisionEngineErrorResponse;
