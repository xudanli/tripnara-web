/** Unified Decision Gateway + RFC-001 Canonical L2（对齐 tripnara.unified_decision_center@v1） */

import type {
  DecisionOption,
  DecisionTradeoffRow,
} from '@/types/decision-problem';
import type { CandidateComparisonView } from '@/types/candidate-comparison';
import type { DecisionCenterOverview } from '@/types/decision-problem';

export type Rfc001SemanticCapability =
  | 'ROAD_SEGMENT_UNAVAILABLE'
  | 'WEATHER_ACTIVITY_PROHIBITED'
  | 'EXCESSIVE_DAILY_LOAD'
  | (string & {});

export type CanonicalL2Phase =
  | 'NEEDS_EVALUATE'
  | 'AWAITING_AUTHORIZE'
  | 'AWAITING_EXECUTE'
  | 'EFFECTIVE'
  | 'ROLLED_BACK'
  | 'NEEDS_REPAIR'
  | 'UNKNOWN';

/** tripnara.unified_decision_problems@v1 — 列表/详情/options 统一 flow */
export type UnifiedProblemFlow = 'CANONICAL_L2' | 'LEGACY_V15';

/** @alias UnifiedProblemFlow */
export type UnifiedDecisionProblemFlow = UnifiedProblemFlow;

export interface Rfc001CandidateView {
  candidateId: string;
  label: string;
  description?: string;
}

/** POST evaluate 内联 — AI 委员会 / Abu·Dr.Dre·utility 卡片 */
export interface Rfc001EvaluateCandidateView {
  candidateId: string;
  label?: string;
  description?: string;
  abuVerdict?: string;
  dreVerdict?: string;
  neptuneVerdict?: string;
  blocked?: boolean;
  blockedReason?: string;
  utility?: number;
}

export interface Rfc001UtilityEvaluationRow {
  dimension?: string;
  value?: number;
  weight?: number;
  explanation?: string;
}

export interface Rfc001DecisionRecordView {
  decisionId?: string;
  recordStatus?: string;
  finalAction?: string;
  selectedCandidateId?: string;
  utilityEvaluation?: Rfc001UtilityEvaluationRow[];
}

export interface Rfc001PlanVersionView {
  status?: string;
  planVersionId?: string;
}

export interface Rfc001ProblemCoreView {
  semanticCapability: Rfc001SemanticCapability;
  status?: string;
  title?: string;
  description?: string;
  urgency?: string;
}

export interface DecisionRouteView {
  resolution?: string;
  engineId?: string;
  reason?: string;
}

export interface Rfc001DecisionCenterProblemView {
  problemId: string;
  rfc001Problem: Rfc001ProblemCoreView;
  leadingPersona?: string;
  requiresUserConfirmation?: boolean;
  candidates?: Rfc001CandidateView[];
  record?: Rfc001DecisionRecordView;
  planVersion?: Rfc001PlanVersionView;
  route?: DecisionRouteView;
}

export interface TripDecisionProblemRouteView {
  problemId: string;
  engineId: string;
  resolution?: string;
}

export interface TripDecisionRoutingView {
  problemRoutes?: TripDecisionProblemRouteView[];
  apis?: Record<string, string>;
}

export interface Rfc001DecisionCenterTripView {
  schemaId?: string;
  tripId?: string;
  problems?: Rfc001DecisionCenterProblemView[];
  routing?: TripDecisionRoutingView;
}

export interface UnifiedDecisionActivePacksLayer {
  packId: string;
}

export interface UnifiedDecisionActivePacks {
  schemaId?: string;
  country?: string;
  packIds?: string[];
  layers?: UnifiedDecisionActivePacksLayer[];
  supportedSemanticKeys?: string[];
}

export interface UnifiedDecisionCenterView {
  schemaId?: string;
  tripId: string;
  activeResolution?: string;
  problemCount?: number;
  activePacks?: UnifiedDecisionActivePacks;
  /** SSOT v2 L1 总览（Gateway 聚合） */
  overview?: UnifiedDecisionCenterOverviewView;
  canonical?: Rfc001DecisionCenterTripView;
  legacy?: DecisionCenterOverview | null;
}

export interface CanonicalEvaluateResponse {
  ok?: boolean;
  route?: DecisionRouteView;
  runId?: string;
  record?: Rfc001DecisionRecordView;
  planVersion?: Rfc001PlanVersionView;
  humanDecisionRequired?: boolean;
  /** 与 GET .../options 同源 — evaluate 内联 */
  options?: DecisionOption[];
  candidates?: Rfc001EvaluateCandidateView[];
  leadingPersona?: string;
  generatedAt?: string;
  comparisonView?: CandidateComparisonView;
  impactScopeView?: import('@/types/impact-scope').ImpactScopeView;
}

/** normalizeCanonicalEvaluateResponse 输出 */
export interface NormalizedCanonicalEvaluateResponse {
  ok?: boolean;
  route?: DecisionRouteView;
  runId?: string;
  record?: Rfc001DecisionRecordView;
  planVersion?: Rfc001PlanVersionView;
  humanDecisionRequired?: boolean;
  options: DecisionOption[];
  candidates: Rfc001EvaluateCandidateView[];
  leadingPersona?: string;
  generatedAt?: string;
  recommendedCandidateId?: string;
  comparisonView?: CandidateComparisonView;
  impactScopeView?: import('@/types/impact-scope').ImpactScopeView;
}

export interface CanonicalAuthorizeRequest {
  choice?: string;
}

export interface CanonicalAuthorizeResponse {
  ok?: boolean;
  record?: Rfc001DecisionRecordView;
  planVersion?: Rfc001PlanVersionView;
}

export interface CanonicalExecuteResponse {
  ok?: boolean;
  record?: Rfc001DecisionRecordView;
  planVersion?: Rfc001PlanVersionView;
}

/** tripnara.unified_decision_problems@v1 — Gateway 统一问题列表 */
export interface UnifiedDecisionProblemListMeta {
  total: number;
  canonicalCount: number;
  legacyCount: number;
  /** v2 — 与 overview / conflicts 对齐的 open 计数 */
  openCount?: number;
  /** v2 — 用户可操作的待决策数（角标优先） */
  actionableCount?: number;
  occurrenceCount?: number;
}

export interface UnifiedDecisionProblemCanonicalSummary {
  leadingPersona?: string;
  requiresUserConfirmation?: boolean;
  candidates?: Rfc001CandidateView[];
  record?: Rfc001DecisionRecordView;
  planVersion?: Rfc001PlanVersionView;
  description?: string;
  optionsCount?: number;
  impactScopeView?: import('@/types/impact-scope').ImpactScopeView;
}

export interface UnifiedDecisionProblemLegacySummary {
  type?: string;
  primaryEnforcement?: string;
  detectedBy?: string;
  optionsCount?: number;
  evidenceValidUntil?: string;
  affectedScopeSummary?: string;
  affectedDayNumbers?: number[];
  affectedMemberIds?: string[];
  semanticKey?: string;
  categoryLabel?: string;
  description?: string;
}

/** Gateway v2 — 列表项结构化范围（与 legacySummary.affectedDayNumbers 互补） */
export interface UnifiedDecisionProblemListScope {
  dayIds?: number[];
  affectedDays?: number[];
}

export interface UnifiedDecisionProblemListItem {
  problemId: string;
  /** @deprecated v2 使用 actionability.writeChain */
  flow?: UnifiedProblemFlow;
  route: DecisionRouteView;
  semanticKey?: string;
  /** v2 — 实例键（同 semanticKey 去重） */
  instanceKey?: string;
  semanticCapability?: Rfc001SemanticCapability;
  title: string;
  /** v2 — 完整诊断句（同 legacySummary.description） */
  summary?: string;
  /** v2 — 左栏分类 */
  categoryLabel?: string;
  status: string;
  /** v2 */
  enforcement?: string;
  workflowStatus?: DecisionWorkflowStatus;
  executionStatus?: DecisionExecutionStatusSurface;
  actionability?: DecisionActionability;
  impactScopeView?: import('@/types/impact-scope').ImpactScopeView;
  canonicalSummary?: UnifiedDecisionProblemCanonicalSummary;
  legacySummary?: UnifiedDecisionProblemLegacySummary;
  /** v2 — 结构化天次范围（PlanObject 午餐窗等） */
  scope?: UnifiedDecisionProblemListScope;
  /** causal-trace-v1 — 列表卡片副标题 enrich（旅行类问题） */
  causalStoryView?: import('@/types/causal-trace').CausalStoryView;
  /** causal-trace-v1 — 安全角标文案 */
  guardianCausalStoryView?: import('@/types/causal-trace').CausalStoryView;
}

export interface UnifiedDecisionProblemListView {
  schemaId?: string;
  meta: UnifiedDecisionProblemListMeta;
  items: UnifiedDecisionProblemListItem[];
}

/** Gateway 代理响应信封 — options / preview / evaluate 等 */
export interface UnifiedGatewayEnvelope<T = unknown> {
  ok?: boolean;
  route?: DecisionRouteView;
  flow?: UnifiedProblemFlow;
  data: T;
}

export interface WeatherHazardPollRequest {
  dayIndex: number;
  runFull?: boolean;
}

export interface ProactiveDetectionProblemRef {
  problemId?: string;
  semanticCapability?: Rfc001SemanticCapability;
}

export interface WeatherHazardPollResponse {
  ok?: boolean;
  dayIndex?: number;
  runFull?: boolean;
  changed?: boolean;
  hazardsDetected?: number;
  message?: string;
  result?: unknown;
  record?: Rfc001DecisionRecordView;
  problem?: ProactiveDetectionProblemRef;
}

/** POST /trips/:tripId/daily-load/scan — EXCESSIVE_DAILY_LOAD pipeline */
export interface DailyLoadScanRequest {
  runFull?: boolean;
}

export interface DailyLoadScanResponse {
  ok?: boolean;
  runFull?: boolean;
  overloaded?: boolean;
  problemsDetected?: number;
  scanId?: string;
  message?: string;
  route?: DecisionRouteView;
  result?: unknown;
  record?: Rfc001DecisionRecordView;
  problem?: ProactiveDetectionProblemRef;
}

// ─── SSOT v2（tripnara.unified_decision@v2）────────────────────────────────────

/** 写路径：替代 flowKind 双轨分支 */
export type DecisionWriteChain = 'EVALUATE_AUTHORIZE_EXECUTE' | 'APPLY_AND_POLL';

export type DecisionExecutionStatusSurface =
  | 'NONE'
  | 'NOT_STARTED'
  | 'DRAFT_CREATED'
  | 'PROPOSED'
  | 'APPLYING'
  | 'APPLIED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | (string & {});

export type DecisionWorkflowStatus =
  | 'OPEN'
  | 'WAITING_DECISION'
  | 'ASSESSING'
  | 'DECIDED'
  | 'RESOLVED'
  | 'DISMISSED'
  | (string & {});

export type DecisionResolutionStatus =
  | 'PROPOSED'
  | 'AUTHORIZED'
  | 'DECIDED'
  | (string & {});

export interface DecisionProblemResolutionView {
  resolutionId: string;
  status?: DecisionResolutionStatus;
  selectedActionId?: string;
  nextStep?: 'APPLY' | string;
}

export interface SubmitDecisionResolutionRequest {
  /** SSOT — 来自 GET detail.actions[].actionId（别名 actionId / optionId 会在客户端归一） */
  selectedActionId: string;
  /** causal-trace-v1 — 来自 detail / preview；apply 时校验 worldStateVersion */
  causalTraceRef?: import('@/types/causal-trace').CausalTraceReference;
  idempotencyKey?: string;
  reason?: string;
  acknowledgement?: string[];
}

export interface SubmitDecisionResolutionResponse {
  resolution: DecisionProblemResolutionView;
  nextStep?: 'APPLY' | string;
  problem?: {
    workflowStatus?: DecisionWorkflowStatus;
    executionStatus?: DecisionExecutionStatusSurface;
  };
  /** submit 后提示 apply 前可安排的跟进（与 semanticKey 规则或后端返回对齐） */
  suggestedFollowUps?: string[];
  /** 结构化 suggestedFollowUps（含 kind / description） */
  structuredSuggestedFollowUps?: import('@/lib/decision-collaborative-sub-task.util').StructuredSuggestedFollowUp[];
  collaborativeTask?: ApplyDecisionCollaborativeTaskView;
}

export interface ApplyDecisionProblemRequest {
  acknowledgement?: string[];
  /** causal-trace-v1 — 与 submit 同源回传（apply 校验 worldStateVersion） */
  causalTraceRef?: import('@/types/causal-trace').CausalTraceReference;
}

/** POST apply?async=1 → 202 Accepted */
export type DecisionProblemApplyTaskStatus =
  | 'PENDING'
  | 'APPLYING'
  | 'REVALIDATING'
  | 'READY'
  | 'FAILED';

export interface DecisionProblemApplyAcceptedView {
  schemaId?: string;
  taskId: string;
  status: DecisionProblemApplyTaskStatus | string;
  pollUrl?: string;
  pollIntervalMs?: number;
  reused?: boolean;
}

export interface DecisionProblemApplyTaskView {
  schemaId?: string;
  taskId: string;
  status: DecisionProblemApplyTaskStatus | string;
  pollIntervalMs?: number;
  result?: ApplyDecisionProblemResponse;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface ApplyDecisionProblemResponse {
  resolution?: DecisionProblemResolutionView;
  problem?: {
    workflowStatus?: DecisionWorkflowStatus;
    executionStatus?: DecisionExecutionStatusSurface;
  };
  applyResult?: {
    actionPlanId?: string;
    status?: string;
    message?: string;
  };
  revalidation?: {
    status?: 'PENDING' | 'PASSED' | string;
  };
  /** apply 首次成功且无手动子任务时，按 semanticKey 自动 seed */
  suggestedSubTasks?: DecisionCollaborativeSubTaskView[];
  /** 含更新后的 actionPlanId（幂等：已有手动子任务时仅同步） */
  collaborativeTask?: ApplyDecisionCollaborativeTaskView;
}

export interface ApplyDecisionCollaborativeTaskView {
  resolutionId?: string;
  actionPlanId?: string;
  problemId?: string;
  decisionProblemId?: string;
}

export interface DecisionActionability {
  writeChain: DecisionWriteChain;
  /** 是否允许用户发起写操作 */
  writable?: boolean;
}

/** GET detail / options — 方案与写操作 SSOT */
export interface DecisionAction {
  actionId: string;
  /** v2 展示标题（优先于 label） */
  title?: string;
  label: string;
  /** v2 摘要 */
  summary?: string;
  description?: string;
  allowed: boolean;
  blockedReason?: string | null;
  /** ALTERNATIVE_GENERATOR | CONSTRAINT_SOLVER | … */
  source?: string;
  expectedImpact?: string;
  navigationTarget?: string | import('@/lib/decision-navigation.util').DecisionNavigationTarget;
  /** evaluate / authorize / execute / preview / apply_decision … */
  kind?: string;
  payload?: Record<string, unknown>;
  /** SSOT v2 — 问题来源（如 FEASIBILITY / GATE） */
  origin?: string;
  /** SSOT v2 — 触发探测器列表 */
  detectors?: string[];
}

export interface UnifiedDecisionProblemDetailView {
  problemId: string;
  semanticKey?: string;
  instanceKey?: string;
  enforcement?: string;
  workflowStatus?: DecisionWorkflowStatus;
  executionStatus?: DecisionExecutionStatusSurface;
  actionability: DecisionActionability;
  actions?: DecisionAction[];
  resolution?: DecisionProblemResolutionView;
  title?: string;
  description?: string;
  impactScopeView?: import('@/types/impact-scope').ImpactScopeView;
  /** 仅 ?includeDebug=1 */
  debug?: {
    authority?: unknown;
    suppressedActions?: import('@/types/unified-decision').DecisionAction[];
  };
  /** causal-trace-v1 */
  causalTraceRef?: import('@/types/causal-trace').CausalTraceReference;
  causalStoryView?: import('@/types/causal-trace').CausalStoryView;
  guardianCausalStoryView?: import('@/types/causal-trace').CausalStoryView;
}

export interface UnifiedDecisionOptionsView {
  problemId?: string;
  actions?: DecisionAction[];
  /** @deprecated 使用 actions[] */
  options?: import('@/types/decision-problem').DecisionOption[];
}

export interface UnifiedDecisionCenterOverviewView {
  schemaId?: string;
  totalOpenProblemCount?: number;
  blockingProblemCount?: number;
  resolvedProblemCount?: number;
  totalProblemCount?: number;
  occurrenceCount?: number;
  headline?: string;
  problems?: UnifiedDecisionProblemListItem[];
  problemCounts?: {
    open?: number;
    byEnforcement?: Partial<Record<string, number>>;
  };
  /** 与 planning-conflicts.summary.total 应对齐 */
  alignedConflictCount?: number;
  /** causal-trace-v1 — 首个开放旅行问题的 Abu 投影 */
  guardianHeadline?: string;
  guardianAssessment?: string;
}

export type DecisionCollaborativeSubTaskKind =
  | 'ACCOMMODATION_LOOKUP'
  | 'CANCELLATION_POLICY'
  | 'TEAM_CONFIRM'
  | 'BOOKING_FOLLOWUP'
  | 'OTHER'
  | (string & {});

export type DecisionCollaborativeSubTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | (string & {});

export const DECISION_COLLABORATIVE_SUBTASK_UPDATE_SCHEMA_ID =
  'tripnara.decision_collaborative_subtask_update@v1' as const;

export interface DecisionCollaborativeSubTaskView {
  id: string;
  resolutionId: string;
  title: string;
  kind: DecisionCollaborativeSubTaskKind;
  description?: string;
  assigneeUserId?: string | null;
  status?: DecisionCollaborativeSubTaskStatus;
  createdAt?: string;
}

export interface CreateDecisionCollaborativeSubTaskRequest {
  /** 可省略 — 后端自动绑定当前 AUTHORIZED resolution */
  resolutionId?: string;
  title: string;
  kind: DecisionCollaborativeSubTaskKind;
  description?: string;
  assigneeUserId?: string;
  actionPlanId?: string;
}

export interface CreateDecisionCollaborativeSubTaskResponse {
  subTask: DecisionCollaborativeSubTaskView;
}

export interface ListDecisionCollaborativeSubTasksResponse {
  items: DecisionCollaborativeSubTaskView[];
}

export interface PatchDecisionCollaborativeSubTaskRequest {
  status?: DecisionCollaborativeSubTaskStatus;
  assigneeUserId?: string | null;
  title?: string;
  description?: string;
}

export interface PatchDecisionCollaborativeSubTaskResponse {
  schemaId?: string;
  subTask: DecisionCollaborativeSubTaskView;
}

/** @alias PatchDecisionCollaborativeSubTaskRequest */
export type UpdateDecisionCollaborativeSubTaskRequest = PatchDecisionCollaborativeSubTaskRequest;

/** @alias PatchDecisionCollaborativeSubTaskResponse */
export type UpdateDecisionCollaborativeSubTaskResponse = PatchDecisionCollaborativeSubTaskResponse;

