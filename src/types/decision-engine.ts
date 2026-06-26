/**
 * 决策引擎 API 类型定义（用户端）
 * 基于 API 文档 v1 规范
 */

import type { CausalRuntimeEcho, TripWorldState } from '@/types/causal-travel-runtime';
import type { HardTrekTrailPlan } from '@/types/hiking';

export type {
  CausalObservationV1,
  CausalRuntimeEcho,
  CausalOutcomeRequest,
  CausalOutcomeResponseData,
  OpsRealityOutcomeCausalExtension,
  TripWorldState,
} from '@/types/causal-travel-runtime';

// ==================== 通用类型 ====================

export type DecisionStatus = 'pending' | 'completed' | 'failed';
export type FeedbackType = 'rating' | 'implicit';
export type ExplanationDetailLevel = 'brief' | 'standard' | 'detailed';
export type ExplanationLanguage = 'zh' | 'en';
export type TrendDirection = 'stable' | 'increasing' | 'decreasing';

// ==================== 用户偏好 ====================

export interface UserPreferences {
  safety: number;
  experienceDensity: number;
  budgetSensitivity: number;
}

export interface DecisionConstraints {
  maxBudget?: number;
  mustInclude?: string[];
  mustExclude?: string[];
}

export interface DecisionOptions {
  includeExplanation?: boolean;
  maxAlternatives?: number;
  language?: ExplanationLanguage;
}

// ==================== 决策请求/响应 ====================

export interface CreateDecisionRequest {
  tripId: string;
  preferences: UserPreferences;
  constraints?: DecisionConstraints;
  options?: DecisionOptions;
}

export interface PlanItem {
  id: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  type?: string;
  cost?: number;
}

export interface SelectedPlan {
  id: string;
  items: PlanItem[];
  utility: number;
  totalDuration: string;
  estimatedCost: number;
}

export interface AlternativePlan {
  id: string;
  utility: number;
  summary: string;
}

export interface KeyFactor {
  name: string;
  contribution: '正向' | '负向' | 'positive' | 'negative';
  description: string;
  importance?: string;
  value?: string;
  icon?: string;
}

export interface DecisionExplanation {
  summary: string;
  keyFactors: KeyFactor[];
}

export interface CreateDecisionResponse {
  decisionId: string;
  status: DecisionStatus;
  selectedPlan: SelectedPlan;
  alternatives: AlternativePlan[];
  explanation?: DecisionExplanation;
  confidence: number;
  processingTime: number;
}

export interface DecisionMetadata {
  processingTime: number;
  samplesUsed: number;
  constraintsChecked: number;
}

export interface DecisionDetail {
  decisionId: string;
  status: DecisionStatus;
  createdAt: string;
  selectedPlan: SelectedPlan;
  explanation?: DecisionExplanation;
  metadata: DecisionMetadata;
}

// ==================== 方案切换 ====================

export interface SelectPlanRequest {
  planId: string;
  reason?: string;
}

export interface SelectPlanResponse {
  success: boolean;
  selectedPlanId: string;
}

// ==================== 反馈 ====================

export interface DecisionFeedbackRequest {
  type: FeedbackType;
  rating?: number;
  comment?: string;
  selectedOption?: string;
  context?: {
    completedTrip?: boolean;
    weatherCondition?: string;
    [key: string]: unknown;
  };
}

export interface DecisionFeedbackResponse {
  feedbackId: string;
  received: boolean;
  message: string;
}

export interface PreferenceFeedbackRequest {
  type: 'implicit';
  action: string;
  attractionId?: string;
  tripId?: string;
  timestamp: string;
  [key: string]: unknown;
}

// ==================== 解释 ====================

export interface Tradeoff {
  dimensions: string;
  explanation: string;
  recommendation: string;
}

export interface ConstraintStatus {
  name: string;
  status: 'satisfied' | 'violated' | 'not_applicable';
  explanation: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  summary: string;
  factors: Array<{
    name: string;
    severity: string;
    description: string;
  }>;
}

export interface Recommendation {
  action: string;
  reasoning: string[];
  caveats: string[];
  nextSteps: string[];
}

export interface DetailedExplanation {
  summary: string;
  keyFactors: Array<{
    name: string;
    importance: string;
    value: string;
    description: string;
    icon?: string;
  }>;
  tradeoffs: Tradeoff[];
  constraints: ConstraintStatus[];
  riskAssessment: RiskAssessment;
  recommendation: Recommendation;
}

export interface NaturalLanguageExplanation {
  text: string;
}

// ==================== 历史记录 ====================

export interface DecisionHistoryQuery {
  page?: number;
  pageSize?: number;
  tripId?: string;
  status?: DecisionStatus;
  from?: string;
  to?: string;
}

export interface DecisionHistoryItem {
  decisionId: string;
  tripId: string;
  status: DecisionStatus;
  utility: number;
  createdAt: string;
  summary: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface DecisionHistoryResponse {
  items: DecisionHistoryItem[];
  pagination: Pagination;
}

export interface PreferenceConfidence {
  confidence: number;
  trend: TrendDirection;
}

export interface LearningProgress {
  totalInteractions: number;
  preferenceLearned: {
    safety: PreferenceConfidence;
    experienceDensity: PreferenceConfidence;
    budgetSensitivity: PreferenceConfidence;
    [key: string]: PreferenceConfidence;
  };
  recommendationAccuracy: number;
  improvementRate: string;
}

// ==================== WebSocket ====================

export type WebSocketMessageType = 
  | 'subscribe'
  | 'unsubscribe'
  | 'progress'
  | 'completed'
  | 'error';

export interface WebSocketSubscribeMessage {
  type: 'subscribe';
  channel: string;
  decisionId?: string;
}

export interface WebSocketProgressMessage {
  type: 'progress';
  stage: string;
  progress: number;
}

export interface WebSocketCompletedMessage {
  type: 'completed';
  decisionId: string;
  utility: number;
}

export interface WebSocketErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type WebSocketMessage =
  | WebSocketSubscribeMessage
  | WebSocketProgressMessage
  | WebSocketCompletedMessage
  | WebSocketErrorMessage;

// ==================== API 信封（与后端 StandardResponse 对齐）====================

export interface DecisionEngineApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ==================== P-OPS：治理快照（generatePlan log / repairPlan log）====================

export type OpsGovernanceAction =
  | 'ALLOW'
  | 'WARN_ONLY'
  | 'DEGRADED_EXECUTION_SEMANTICS'
  | 'BLOCK_FINALIZE'
  | 'REQUIRE_REROUTE_OR_USER_CONFIRM';

export interface OpsOperationalGovernanceBranchWeather {
  branch: 'weather';
  action: OpsGovernanceAction;
  reasonCodes: string[];
  detail?: string;
}

export interface OpsOperationalGovernanceBranchWorldFact {
  branch: 'world_fact';
  action: OpsGovernanceAction;
  reasonCodes: string[];
  ageSeconds: number;
  expiredByValidTo: boolean;
}

/** P-OPS：结构化治理快照（出现在 generatePlan 等返回的 log 内） */
export interface OpsOperationalGovernanceSnapshot {
  policyVersion: string;
  evaluatedAt: string;
  weather?: OpsOperationalGovernanceBranchWeather;
  worldFact?: OpsOperationalGovernanceBranchWorldFact;
}

/** 决策引擎 plan/repair 返回的 log 可能携带 opsOperationalGovernance */
export type DecisionEnginePlanLog = Record<string, unknown> & {
  opsOperationalGovernance?: OpsOperationalGovernanceSnapshot;
  hardTrekTrailPlan?: HardTrekTrailPlan;
  routeDirection?: { selected?: { name?: string } };
};

/** P-OPS-3：GET operational-policy */
export interface OpsOperationalPolicyConfigV1 {
  version: 'p-ops-3/v1' | string;
  weather?: Record<string, unknown>;
  worldFact?: Record<string, unknown>;
  routing?: Record<string, unknown>;
  [key: string]: unknown;
}

// ==================== P-OPS-2：Ops Reality Audit ====================

/** Outcome 写入 JSON（建议形状） */
export interface OpsRealityOutcomePayloadV1 {
  schema: 'p-ops-2-outcome/v1' | string;
  recordedAtIso: string;
  summary: string;
  delta?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface RecordRealityOutcomeRequest {
  /** 必填；可为 OpsRealityOutcomePayloadV1 或后端扩展形状 */
  outcome: OpsRealityOutcomePayloadV1 | Record<string, unknown>;
  source?: string;
  trip_run_id?: string;
  execution_trace_id?: string;
  /** P5：与 generate-plan 同会话的 TripWorldState（客户端缓存回填） */
  state?: TripWorldState;
  /** 与预测 tick join */
  causality_id?: string;
  tripId?: string;
}

export type RecordRealityOutcomeResult = OpsRealityOutcomeCausalExtension;

export interface OpsRealitySnapshotListItem {
  id: string;
  capturedAt: string;
  predictionFingerprint: string;
  hasOutcome: boolean;
}

export interface OpsRealityByTripData {
  tripId: string;
  snapshots: OpsRealitySnapshotListItem[];
}

export interface OpsRealityReplayCompareData {
  snapshotId: string;
  predictionFingerprint: string;
  comparablePredictionFp: string;
  comparableObservationFp: string | null;
  match: boolean | null;
  note?: string;
}

export interface DecisionEngineHealthData {
  status: string;
  capabilities?: Record<string, unknown>;
  [key: string]: unknown;
}

// ==================== 决策引擎核心请求/响应（camelCase；与 /decision-engine/v1 对齐）====================

export type GeneratePlanRequest = TripWorldState & Record<string, unknown>;

export interface GeneratePlanResponseData extends CausalRuntimeEcho {
  plan?: unknown;
  log?: DecisionEnginePlanLog;
}

export type RepairPlanRequest = TripWorldState & Record<string, unknown>;

export interface RepairPlanResponseData extends CausalRuntimeEcho {
  plan?: unknown;
  log?: DecisionEnginePlanLog;
}

export type ValidateSafetyRequest = Record<string, unknown>;
export type ValidateSafetyResponseData = Record<string, unknown>;

export type CheckConstraintsRequest = Record<string, unknown>;
export type CheckConstraintsResponseData = Record<string, unknown>;

export type GenerateMultiplePlansRequest = Record<string, unknown>;
export type GenerateMultiplePlansResponseData = Record<string, unknown>;

export type ExplainPlanRequest = Record<string, unknown>;
export type ExplainPlanResponseData = Record<string, unknown>;
