import apiClient from './client';
import type { ClarificationAnswer, ClarificationQuestion } from '@/types/clarification';
import { CONFIG } from '@/constants/config';
import {
  type RouteRunAsyncPhase,
  type RouteRunAsyncTaskStatus,
  type RouteRunAsyncTaskStatusSnapshot,
} from '@/lib/route-run-async';
import { normalizeAgentTaskPollPath } from '@/lib/route-run-task-path';
import { attachTaskLeaseToSnapshot } from '@/lib/task-lease-ui';
import { awaitRouteAndRunTaskCompletion } from '@/lib/route-run-task-sse';

export type { RouteRunAsyncPhase, RouteRunAsyncTaskStatus };

// ==================== 类型定义 ====================

/**
 * LLM 提供商
 */
export type LLMProvider = 'auto' | 'openai' | 'deepseek' | 'gemini' | 'anthropic';

/**
 * 路由类型
 */
export type RouteType = 'SYSTEM1_API' | 'SYSTEM1_RAG' | 'SYSTEM2_REASONING' | 'SYSTEM2_WEBBROWSE';

/**
 * 结果状态
 */
export type ResultStatus = 'OK' | 'NEED_MORE_INFO' | 'NEED_CONSENT' | 'NEED_CONFIRMATION' | 'FAILED' | 'TIMEOUT' | 'REDIRECT_REQUIRED';

/**
 * UI 状态
 */
export type UIStatus = 'thinking' | 'browsing' | 'verifying' | 'repairing' | 'awaiting_consent' | 'awaiting_confirmation' | 'awaiting_user_input' | 'done' | 'failed';

/**
 * 对话上下文（route_and_run 请求体）
 *
 * - `recent_messages`：多轮短窗摘要（「用户: …」「助手: …」），非结构化卡片全文。
 *   车型/酒店等字段解析须用本轮 `message`，勿用本字段做前端启发式。
 * - `context_type: active_trip_summary` + `trip_id`：触发行程事实/记忆层注入，不替代长期偏好存储。
 */
export interface ConversationContext {
  recent_messages?: string[];
  /** 英文问卷与引导：传 `en` / `en-US`；不传则后端默认中文矩阵 */
  locale?: string;
  timezone?: string;
  /**
   * 由前端注入的上下文类型，例如 `active_trip_summary`。
   * 后端可在 route_and_run 时结合 `user_id` + `trip_id` 拉取行程洞察 / 记忆层。
   */
  context_type?: string;
}

/**
 * 入口来源标识
 */
export type EntryPoint =
  | 'trip_detail_page'
  | 'trip_list_page'
  | 'dashboard'
  | 'planning_workbench'
  | 'execute';

/**
 * 智能体执行选项
 */
export interface AgentOptions {
  dry_run?: boolean;
  allow_webbrowse?: boolean;
  max_seconds?: number;
  max_steps?: number;
  max_browser_steps?: number;
  cost_budget_usd?: number;
  llm_provider?: LLMProvider;  // LLM 提供商，默认 'auto'
  // 新增字段
  entry_point?: EntryPoint;  // 入口来源标识，用于权限控制和操作限制
  readonly_mode?: boolean;  // 只读模式标志，true 时限制为查询类操作
  /**
   * 前端显式意图（覆盖服务端 inferTaskType）。不传或显式 `AUTO` 时完全走服务端启发式。
   * - `TRIP_PLANNING`：行程规划/修改
   * - `DATA_LOOKUP`：咨询侧固定「检索档」（强制知识库/RAG 等检索路径）
   * - `GENERIC_QA`：闲聊、总结、泛问答等（非强制检索，区别于检索档）
   * 与 RouteDecision.task_type 取值对齐。
   */
  intent_mode?: 'AUTO' | 'TRIP_PLANNING' | 'DATA_LOOKUP' | 'GENERIC_QA';
  /**
   * 走 Claude 编排链路（与 RouteAndRunRequestDto / CLI 对齐）。
   * 与 `enable_live_tools`（航班/天气等传感器）联用时后端注入 Amadeus · Flight MCP，前端不配 MCP URL。
   */
  use_claude_orchestration?: boolean;
  /**
   * 强制使用状态机编排。规划/改稿请求应显式传 true，避免后端环境默认值把深规划落到 LEGACY。
   */
  use_state_machine_orchestration?: boolean;
  /**
   * 开启实时工具链。前端发送时应传明确通道列表，如
   * `["weather","flight","hotel","car_rental"]`（历史客户端传 true 时由后端兼容为默认集）。
   * 酒店/租车等常需 `trip_id` 且行程带日期方生效；**flight** 由服务端凭证调用 Amadeus / Flight MCP。
   */
  enable_live_tools?: string[];
  /**
   * 意图标记位，用于可控触发特定工具/路由（如天气）。
   * 可为键值对象或字符串数组，以后端约定为准。
   */
  intent_flags?: Record<string, boolean | string | number> | string[];
  /**
   * 已有 `trip_runs.id`（UUID），用于 DSO checkpoint / 续跑；与响应 observability 回显对齐（蛇形 JSON）。
   */
  durable_trip_run_id?: string;
  /**
   * System 1 快路径人格倾向（透传后续 S2；不要求前端展示三人格结论）。
   * 与后端 route_and_run DTO 对齐，字段名 snake_case。
   */
  persona_hint?: RouteRunPersonaHint;
  /**
   * 为 true 时 REPAIR/效用预算耗尽仍 NARRATE → SUCCESS + flawed_draft_v1（须展示瑕疵 Banner）
   */
  allow_flawed_draft_narrate?: boolean;
  /**
   * 为 true 时门控非致命可走影子辩论 LLM，响应中可能出现 `source: 'llm_debate'`；
   * 不传则多为规则投影 `violation_projection_v1`。
   */
  enable_guardians_debate_llm?: boolean;
  /**
   * 为 true 时响应可含 explain.simplified_explanation、三人格调试分等；产品默认 false。
   */
  show_debug_scores?: boolean;
  /**
   * 改排草案落库：须配合 message「应用到行程」与 itinerary_adjust_draft_snapshot。
   * 续跑时传 durable_trip_run_id（上一趟 route_and_run observability 回显）。
   */
  apply_itinerary_adjust_draft?: boolean;
  itinerary_adjust_draft_snapshot?: import('@/lib/itinerary-adjust-apply-draft').ItineraryAdjustDraftSnapshot;
  /**
   * 异步大一统：`OFF` 完全同步（默认）；`AUTO` 重规划时 HTTP 202 + 轮询；`FORCE` 立即后台任务。
   */
  async_mode?: 'OFF' | 'AUTO' | 'FORCE';
  /**
   * 客户端已知的最新 DSO 版本（上次成功 `explain.kernel_explainability.dso_version`）。
   * 写类 route_and_run 建议携带；与 plan_version 无关。
   */
  client_dso_version?: string;
  /**
   * 规划助手 V2 会话 ID（`planning-assistant-v2` sessionId）。
   * 与 v2/chat、accommodations/apply 共用，便于后端关联检索结果与落库索引。
   */
  client_session_id?: string;
  /**
   * D3 多人 rollout：各成员 pace / risk / adventure_weight，影响正式组织力评分。
   */
  party_negotiation_member_profiles?: import('@/types/robustness-dashboard').PartyNegotiationMemberProfile[];
}

/** `options.persona_hint`：三人格松紧度偏好（0–1 或后端约定刻度） */
export interface RouteRunPersonaHint {
  abu_strictness?: number;
  drdre_tolerance?: number;
  neptune_creativity?: number;
}

/**
 * 路由决策信息
 */
export interface RouteDecision {
  route: RouteType;
  /** 快慢路径标签，与 RouterOutputDto 对齐：如 FAST | DEEP；缺省可由后端按 route 推导 */
  selected_path?: string;
  /** 后端判定任务类型（Decision OS 分流），如 TRIP_PLANNING | DATA_LOOKUP | GENERIC_QA */
  task_type?: string;
  /** 路由策略 / 降级路径，如 CLAUDE_DYNAMIC */
  route_policy?: string;
  confidence: number;
  reasons: string[];
  required_capabilities: string[];
  consent_required: boolean;
  budget: {
    max_seconds: number;
    max_steps: number;
    max_browser_steps: number;
  };
  ui_hint: {
    mode: 'fast' | 'slow';
    status: UIStatus;
    /**
     * 顶栏/状态区辅助文案（成功时常为「咨询已完成」「处理完成」等，以前端勿覆盖为准）。
     * System 2 组装成功时常与 payload.ui_surface 一致表达咨询 vs 规划语义。
     */
    message: string;
  };
}

/**
 * 已选目的地/日期等结构化出行意图（与自由文本 message 并存，便于后端 Intake）
 */
export interface StructuredTravelInput {
  destination?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}

/** route_and_run 响应 payload.suggested_operations 单项 */
export type SuggestedOperationKind = 'route_and_run_message' | 'client_navigation';

export interface SuggestedOperation {
  id: string;
  label: string;
  kind: SuggestedOperationKind;
  payload?: {
    /** kind=route_and_run_message：下一轮 POST route_and_run 的 message */
    message?: string;
    /** 与当前会话 trip 对齐；须为数据库 Trip.id（通常为 UUID） */
    trip_id?: string;
    /**
     * 与 `options.intent_mode` 对齐；一键「用行程规划改稿」等须原样带到下一轮请求，勿仅靠正文。
     */
    intent_mode?: 'AUTO' | 'TRIP_PLANNING' | 'DATA_LOOKUP' | 'GENERIC_QA';
    intentMode?: 'AUTO' | 'TRIP_PLANNING' | 'DATA_LOOKUP' | 'GENERIC_QA';
    /** kind=client_navigation：SPA 路由名 */
    route?: 'timeline' | 'replay' | 'planning' | 'itinerary' | 'decision_cockpit' | string;
    [key: string]: unknown;
  };
}

/**
 * 二次 POST `route_and_run` 时与按钮 payload 对齐的嵌套块；后端 ValidationPipe whitelist 须声明后才保留，
 * 入口 merge 会将其中的 trip_id 合入顶层 `trip_id`（顶层优先）。
 */
export interface SuggestedOperationRoutePayload {
  trip_id?: string;
  message?: string;
  /** 与顶层 `options.intent_mode` 一致时下发给后端 merge / 路由 */
  intent_mode?: 'AUTO' | 'TRIP_PLANNING' | 'DATA_LOOKUP' | 'GENERIC_QA';
  [key: string]: unknown;
}

/**
 * 路由并执行请求
 */
export interface RouteAndRunRequest {
  request_id: string;
  user_id: string;
  /**
   * 须为数据库 Trip 主键（多为 UUID），与创建行程 / GET 详情 / 会话绑定字段一致。
   * 勿传页面自造占位符（如 `trip_iceland_20260601`），否则决策与世界上下文会报「行程不存在」。
   */
  trip_id?: string | null;
  /** 与 `trip_id` 同义的驼峰别名；后端 merge 到顶层 `trip_id`。 */
  tripId?: string | null;
  message: string;
  /**
   * 快捷操作按钮：可把 `{ trip_id, message }` 整体放在此字段，避免仅嵌套在未知属性里被 whitelist 剥掉。
   */
  suggested_operation_payload?: SuggestedOperationRoutePayload;
  /** 兼容部分客户端把按钮数据命名为 `payload`。 */
  payload?: Record<string, unknown>;
  /** 已选日期等场景下与 message 一并传递（如澄清卡片提交、绑定行程摘要） */
  structured_travel_input?: StructuredTravelInput;
  /** 澄清卡选项回传（与 options[].value 一致，如 guardian_debate_abu_reject_v1） */
  clarification_answers?: ClarificationAnswer[];
  /**
   * 偏好（成本/省力/时间敏感度等）；住宿卡片 decision_support_zh 等规则文案部分依赖此对象。
   * **人数与 budgetConfig 口径**：由服务端根据 `trip_id` 关联行程加载，无需前端重复下发。
   */
  preference_profile?: {
    max_extra_cost_usd?: number;
    max_delay_minutes?: number;
    cost_sensitivity?: number;
    effort_sensitivity?: number;
    time_sensitivity?: number;
    preferOffbeatAttractions?: boolean;
    travel_style_tags?: string[];
    /** 体能档位：`low` | `medium` | `high`（与问卷 `MEDIUM_LOW` 等等级映射） */
    fitness_level?: string;
    party_profile?: {
      fitness_level?: string;
      fitness_overall_score?: number;
      [key: string]: unknown;
    };
    [key: string]: any;
  };
  /** 当 PT 硬事实冲突时用于协商触发 */
  emergency_constraints?: {
    /** 仅在 PT 站点对约束场景下必需；其他 Story 可省略 */
    pt_station_pair?: { station_a: string; station_b: string };
    heal_prefetch_weather?: boolean;
    [key: string]: any;
  };
  conversation_context?: ConversationContext;
  options?: AgentOptions;
  /** 规划前实时传感器 / 离线地图等（与后端 DTO metadata 对齐） */
  metadata?: import('@/types/route-run-emotional-metadata').RouteRunEmotionalMetadata;
  /** 同行规模 / 体能 / 风险容忍（多人 rollout 评分） */
  party_profile?: {
    party_total?: number;
    fitness_level?: string;
    risk_tolerance?: string;
    [key: string]: unknown;
  };
}

/** 异步发起响应 / 轮询中间态（SUCCESS 时 data 为完整 route_and_run 响应） */
export type RouteRunAsyncTaskStatusResponse = RouteRunAsyncTaskStatusSnapshot<RouteAndRunResponse>;

export type RouteAndRunWithPollingOptions = {
  intervalMs?: number;
  signal?: AbortSignal;
  onProgress?: (snap: RouteRunAsyncTaskStatusResponse) => void;
};

export interface RouteRunAsyncTaskDelegated {
  is_async_delegated?: boolean;
  task_id: string;
  poll_path?: string;
}

export type RouteAndRunInvokeResult =
  | { kind: 'sync'; response: RouteAndRunResponse }
  | { kind: 'async'; taskId: string; pollPath: string };

// ==================== Negotiation / Decision OS v1.0 ====================

export type NegotiationStatus = 'PENDING_USER_DECISION';

export type NegotiationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type NegotiationReasoningTag =
  | 'TAILORED_TO_YOUR_PREFERENCE'
  | 'REAL_TIME_RISK_WARNING'
  | 'ROLLBACK_MEMORY'
  | (string & {});

export interface NegotiationAlternativeDto {
  id: 'UPGRADE_TO_DRIVE' | 'POSTPONE_SCHEDULE' | (string & {});
  cost_delta_usd: number;
  time_delta_minutes: number;
  /** 0–1：综合心理/风险成本 */
  effort_delta: number;
  reasoning_tags?: NegotiationReasoningTag[];
  reliability_score?: number;
  is_fragile?: boolean;
  risk_level?: NegotiationRiskLevel;
  regret_notice?: string;
  [key: string]: any;
}

export interface StrategyImpactMap {
  on_time_model?: { version: string; description?: string };
  baseline?: {
    trip_on_time_probability?: number;
    trip_on_time_probability_interval?: [number, number];
  };
  alternatives?: Array<{
    alternative_id: string;
    trip_on_time_probability?: number;
    trip_on_time_probability_interval?: [number, number];
    segment_comparisons?: any[];
    [key: string]: any;
  }>;
  heat_zones?: Array<{
    segment_id: string;
    bottleneck_node?: boolean;
    criterion?: string;
    details?: any;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface NegotiationPayload {
  status: NegotiationStatus;
  reason: string;
  impact: string;
  alternatives: NegotiationAlternativeDto[];
  default_option_id: string;
  negotiation_session_id: string;
  expected_negotiation_hash: string;
  recommendation_summary: string;
  strategy_impact_map?: StrategyImpactMap;
  [key: string]: any;
}

export interface ConfirmNegotiationRequest {
  /** 与 route_and_run 同会话关联时可传，写入 X-Request-Id 便于审计串联 */
  request_id?: string;
  /** 新版字段：trip 维度 */
  trip_id?: string;
  /** 新版字段：协商会话 id（兼容 negotiation_id） */
  negotiation_id?: string;
  /** 旧版字段：协商会话 id */
  session_id?: string;
  /** 旧版字段：选择的方案 */
  alternative_id?: string;
  /**
   * 新版字段：用户决议
   * - CONFIRM: 确认推荐方案
   * - REJECT / DISCARD: 放弃本次协商
   */
  resolution?: 'CONFIRM' | 'REJECT' | 'DISCARD';
  expected_negotiation_hash: string;
}

export interface ConfirmNegotiationResponse {
  status: 'CONFIRMED';
  resolution_patch_summary: string;
  itinerary: any;
  itinerary_revision?: any;
  [key: string]: any;
}

export interface ItineraryRevisionTimelineResponse {
  revisions: Array<{
    revision_id: string;
    kind: 'BASELINE' | 'CONFIRMED' | 'ROLLBACK' | (string & {});
    created_at: string;
    resolution_patch_summary?: string;
    delta_cost_usd?: number;
    delta_time_minutes?: number;
    interrupted_items?: any[];
    parent_revision_id?: string | null;
    rollback_to_revision_id?: string | null;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface NegotiationRevisionResponse {
  revision: any;
  [key: string]: any;
}

export interface RollbackRequest {
  trip_id?: string;
  revision_id: string;
  request_id?: string;
}

export interface RollbackResponse {
  itinerary: any;
  new_revision_id: string;
  rolled_back_from_revision_id?: string;
  target_revision_id?: string;
  [key: string]: any;
}

export interface DecisionReplayTimelineResponse {
  timeline: any[];
  [key: string]: any;
}

export interface DecisionReplayWhatIfRequest {
  trip_run_id: string;
  assumptions: any[];
  [key: string]: any;
}

export interface DecisionReplayWhatIfResponse {
  what_if_result: any;
  [key: string]: any;
}

export interface DecisionReplayCounterfactualRequest {
  [key: string]: any;
}

export interface DecisionReplayCounterfactualResponse {
  counterfactual_result: any;
  [key: string]: any;
}

export interface TransportModeMeta {
  value: string;
  label_zh?: string;
  label_en?: string;
  aliases?: string[];
}

export interface ConstraintsFieldMeta {
  type?: string;
  items?: string;
  min?: number;
  max?: number;
  [key: string]: any;
}

export interface ConstraintsMetaResponse {
  version?: string;
  transport_modes?: TransportModeMeta[];
  fields?: {
    preferred_modes?: ConstraintsFieldMeta;
    forbidden_modes?: ConstraintsFieldMeta;
    max_wind_speed_tolerance_mps?: ConstraintsFieldMeta;
    [key: string]: ConstraintsFieldMeta | undefined;
  };
  [key: string]: any;
}

/** Decision Replay 会话列表单项（sessions[] / items[] 元素） */
export interface DecisionReplaySessionItem {
  /** 推荐作主列表文案：UTC · 状态中文 · 用户查询预览 */
  list_summary?: string | null;
  /** Trip.name，否则 destination，再否则行程截断占位 */
  trip_display_name?: string | null;
  trip_destination?: string | null;
  /** TripRun.user_query 截断预览（约 96 字） */
  user_query_preview?: string | null;
  planning_phase?: string | null;
  /** TripRun.completed_at ISO，未完成为 null */
  completed_at?: string | null;
  /** 常见 status 的中文；未知则等同原始 status */
  status_label_zh?: string | null;
  session_id?: string;
  id?: string;
  run_id?: string;
  trip_id?: string;
  trip_run_id?: string;
  created_at?: string;
  started_at?: string;
  updated_at?: string;
  timestamp?: string;
  status?: string;
  [key: string]: any;
}

/** Decision Replay 会话列表（字段以后端为准） */
export interface DecisionReplaySessionsResponse {
  sessions?: DecisionReplaySessionItem[];
  items?: DecisionReplaySessionItem[];
  total?: number;
  [key: string]: any;
}

// ==================== Decision DNA / Audit log (best-effort) ====================

export type LogDecisionEvent =
  | 'NEGOTIATION_OPENED'
  | 'NEGOTIATION_VIEWED'
  | 'NEGOTIATION_CONFIRMED'
  | 'NEGOTIATION_DISCARDED'
  | 'NEGOTIATION_REJECTED'
  | 'NEGOTIATION_TAG_EXPANDED'
  | (string & {});

export interface LogDecisionRequest {
  request_id: string;
  user_id: string;
  trip_id?: string | null;
  event: LogDecisionEvent;
  negotiation_session_id?: string;
  expected_negotiation_hash?: string;
  revision_id?: string;
  selected_alternative_id?: string;
  reasoning_tag?: string;
  context?: Record<string, any>;
  client_ts?: string;
}

export interface LogDecisionResponse {
  logged: boolean;
  [key: string]: any;
}

/**
 * 编排步骤
 */
export type OrchestrationStep = 
  | 'INTAKE' 
  | 'RESEARCH' 
  | 'GATE_EVAL' 
  | 'CONTEXT_BUILD'
  | 'PLAN_GEN' 
  | 'OPTIMIZE'
  | 'VERIFY' 
  | 'COMPLIANCE'
  | 'REPAIR' 
  | 'NARRATE'
  | 'FEEDBACK'
  | 'HALLUCINATION_DETECTION'
  | 'STATE_UPDATE'
  | 'DONE' 
  | 'FAILED'
  | 'TIMEOUT'
  | (string & {});

/**
 * 子智能体类型
 */
export type SubAgentType = 
  | 'Orchestrator' 
  | 'Planner' 
  | 'Gatekeeper' 
  | 'Compliance' 
  | 'LocalInsight' 
  | 'CoreDecision' 
  | 'Narrator';

/**
 * 三人格类型
 */
export type GuardianType = 'ABU' | 'DR_DRE' | 'NEPTUNE';

export interface OntologyHardAnchorResult {
  matched_node_ids?: string[];
  labels_zh?: string[];
  road_status_by_node?: Record<string, unknown>;
}

/**
 * VERIFY 步 `metadata.issues[]` 与装配器对齐；`class` 常见 CONFLICT / ADVISORY。
 */
export type VerifyIssueSeverityClass = 'CONFLICT' | 'ADVISORY' | (string & {});

export interface VerifyIssue {
  class?: VerifyIssueSeverityClass;
  code?: string;
  message?: string;
  detail?: string;
  /** BFF 清洗后的用户向正文 */
  display_message_zh?: string;
  class_label_zh?: string;
  code_label_zh?: string;
  [key: string]: unknown;
}

/** explain.simplified_explanation：与 answer_text / narration 并列的只读解释层 */
export interface RouteRunSimplifiedExplanation {
  summary?: string;
  key_decisions?: unknown;
}

export type {
  SegmentEditorMode,
  WorldModelGuards,
  RouteRunOptimizationMethod,
  RouteRunExplainOptimization,
  OptimizationExplain,
  RouteRunDecisionVerdict,
  RouteRunRejectedPlan,
  RouteRunMonteCarloSummary,
  WorldConstraintMaterialization,
  OptimizationAlternative,
} from '@/types/world-model-guards';

/**
 * `decision_log[].metadata.hallucination_audit_zh`（HALLUCINATION_DETECTION）：
 * 与长文案 `outputs_summary` 对齐的结构化抽查结果；统一入口可折叠渲染本对象而不必解析整段字符串。
 */
export interface HallucinationAuditSampleRowZh {
  outcome_zh?: string;
  excerpt_zh?: string;
  outcomeZh?: string;
  excerptZh?: string;
  [key: string]: unknown;
}

/** `decision_log[].metadata.plan_gen_day_digest` 单日条目 */
export interface PlanGenDayDigestEntry {
  day_number?: number;
  dayNumber?: number;
  date_iso?: string;
  dateIso?: string;
  outputs_summary?: string;
  outputsSummary?: string;
  inputs_summary?: string;
  inputsSummary?: string;
  summary_zh?: string;
  summaryZh?: string;
  items_count?: number;
  itemsCount?: number;
  [key: string]: unknown;
}

export interface HallucinationAuditZh {
  total?: number;
  verified?: number;
  risks?: number;
  removed_count?: number;
  removedCount?: number;
  flagged_count?: number;
  flaggedCount?: number;
  sample_rows?: HallucinationAuditSampleRowZh[];
  sampleRows?: HallucinationAuditSampleRowZh[];
  /** 存在风险时的用户向短摘要 */
  user_notification?: string;
  userNotification?: string;
  duration_ms?: number;
  durationMs?: number;
  statistics?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * 决策日志项（新格式 - 完整格式）
 */
export interface DecisionLogEntry {
  request_id: string;
  step: OrchestrationStep;
  actor: SubAgentType;
  inputs_summary: string;
  outputs_summary: string;
  evidence_refs: string[];
  timestamp: string;
  /**
   * 本体 / 路况「依据说明」自然中文（与 `result` / `payload.unified_execution_trace` 同源冗余，便于各面板直绑 `decision_log[i]`）。
   */
  ontology_evidence_display_zh?: string;
  ontologyEvidenceDisplayZh?: string;
  /**
   * 准备度自然语言说明（与 `result` / `unified_execution_trace` 可冗余；**已对接**条件之一：`length > 0`）。
   */
  readiness_evidence_display_zh?: string;
  readinessEvidenceDisplayZh?: string;
  /**
   * 准备度技术引用（与 `evidence_refs` 解耦；**已对接**条件之一：数组中至少一条以 `readiness_pack_check:` 或 `readiness:` 开头）。
   */
  readiness_technical_evidence_refs?: string[];
  readinessTechnicalEvidenceRefs?: string[];
  /** 与装配器对齐：结构化本体命中（可选） */
  result?: {
    ontology_hard_anchor?: OntologyHardAnchorResult;
    ontology_evidence_display_zh?: string;
    ontologyEvidenceDisplayZh?: string;
    readiness_evidence_display_zh?: string;
    readinessEvidenceDisplayZh?: string;
    readiness_technical_evidence_refs?: string[];
    readinessTechnicalEvidenceRefs?: string[];
    payload?: {
      unified_execution_trace?: Record<string, unknown>;
      unifiedExecutionTrace?: Record<string, unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  /** 步骤级附录（如 ontology_road_status_provider 耗时） */
  stepsExecuted?: Record<string, unknown>;
  steps_executed?: Record<string, unknown>;
  metadata?: {
    duration_ms?: number;
    tool_calls?: number;
    cost_est_usd?: number;
    alternatives_considered?: number;
    guardian?: GuardianType;
    ontology_hard_anchor?: OntologyHardAnchorResult;
    ontology_hard_anchor_appendix?: Record<string, unknown>;
    stepsExecuted?: Record<string, unknown>;
    steps_executed?: Record<string, unknown>;
    /** VERIFY：可执行性结构化 issues */
    issues?: VerifyIssue[];
    /**
     * HALLUCINATION_DETECTION：幻觉/事实抽查的结构化明细（计数、sample_rows、user_notification 等），
     * 与 `outputs_summary`（formatHallucinationOutputsZh 等）同源对齐。
     */
    hallucination_audit_zh?: HallucinationAuditZh;
    hallucinationAuditZh?: HallucinationAuditZh;
    /**
     * PLAN_GEN：按天规划 digest（结果/输入可与顶层 outputs_summary、inputs_summary 对齐；
     * 旧日志可由 BFF 出站补全）。
     */
    plan_gen_day_digest?: PlanGenDayDigestEntry[];
    planGenDayDigest?: PlanGenDayDigestEntry[];
    [key: string]: any;
  };
}

/**
 * 决策日志项（旧格式 - 向后兼容）
 * @deprecated 使用 DecisionLogEntry 替代
 */
export interface DecisionLogItem {
  step: number;
  chosen_action: string;
  reason_code?: string;
  confidence?: number;
  facts?: Record<string, any>;
  policy_id?: string;
}

/**
 * 可观测性指标
 */
export interface ObservabilityMetrics {
  latency_ms: number;
  router_ms: number;
  system_mode: 'SYSTEM1' | 'SYSTEM2' | 'REDIRECT';
  /** 后端统一判定的产品侧思考档位：fast=快答；balanced=交互式推理；deep=深规划/状态机 */
  thinking_mode_resolved?: 'fast' | 'balanced' | 'deep';
  tool_calls: number;
  browser_steps: number;
  tokens_est: number;
  cost_est_usd: number;
  fallback_used: boolean;
  /**
   * 路由层任务类型（与 Decision OS 对齐），优先于仅靠 route + 本地推断。
   * 亦可出现在 `result.payload.unified_execution_trace.routing_task_type`。
   */
  routing_task_type?: string;
  /**
   * 是否为缓存回放响应（与实时计算区分）。
   * 可与 {@link getRouteRunOrchestrationModeFinal} === `'DEDUP'` 交叉校验。
   */
  is_replayed?: boolean;
  /** 以下字段与后端 assembler / trace 对齐，均为可选 */
  step_latency_ms?: number;
  gate_block_rate?: number;
  skill_success_rate?: number;
  orchestration_request_id?: string;
  current_step?: string;
  poi_planning?: unknown;
  trace?: Record<string, unknown>;
  /**
   * 本趟关联的 TripRun id（新建或续跑）；与请求 `options.durable_trip_run_id` 对齐。
   */
  durable_trip_run_id?: string | null;
  /**
   * 轻量知识问答：与 `result.payload` 上咨询态标志一致时，前端勿用本趟 timeline/poi 驱动可编辑行程。
   */
  lightweight_knowledge_qa?: boolean;
  /** Memory OS 契约观测（`observability.memory_contract`） */
  memory_contract?: import('@/features/route-and-run/types/observability').MemoryContractObs;
  /** 正式 Robustness Dashboard（ROBUSTNESS_ROLLOUT_ENABLED=1 且 status=OK） */
  robustness_dashboard?: import('@/types/robustness-dashboard').RobustnessDashboardPayload;
  /**
   * 路由类分叉观测；旧响应可能仅出现在 `trace.route_class_fork_v1`。
   * 读取：`obs.route_class_fork_v1 ?? obs.trace?.route_class_fork_v1`。
   */
  route_class_fork_v1?: import('@/types/route-class-observability').RouteClassForkV1;
  /**
   * 路由类漂移评估；旧响应可能仅出现在 `trace.route_class_eval_v1`。
   * 读取：`obs.route_class_eval_v1 ?? obs.trace?.route_class_eval_v1`。
   */
  route_class_eval_v1?: import('@/types/route-class-observability').RouteClassEvalV1;
}

/**
 * 审批挂起信息（当状态为 NEED_CONFIRMATION 时）
 */
export interface SuspensionInfo {
  approvalId: string;
  skillName: string;
  summary: string;
  payload: any;
}

/** 门控证据原子（tooltip / 审计面板：text + violation_code + tag） */
export interface GuardianEvidenceAtom {
  text?: string;
  violation_code?: string;
  tag?: string;
  [key: string]: unknown;
}

/** 与 trip-plan.interface GateResult['guardian_results'].source 对齐 */
export type GuardianResultsSource =
  | 'llm_debate'
  | 'violation_projection_v1'
  | (string & {});

export type GuardianAbuVerdict = 'ALLOW' | 'REJECT' | (string & {});
export type GuardianDrdreVerdict = 'ALLOW' | 'ADJUST' | 'REJECT' | (string & {});
export type GuardianNeptuneVerdict = 'ALLOW' | 'REPLACE' | 'REJECT' | (string & {});

/** 单人格块（abu / drdre / neptune） */
export interface GuardianPersonaGateBlock {
  verdict?: GuardianAbuVerdict | GuardianDrdreVerdict | GuardianNeptuneVerdict | string;
  evidence?: string[];
  /** VERIFY 后可能与可执行性校验对齐刷新（violation_projection_v1 等路径） */
  evidence_atoms?: GuardianEvidenceAtom[];
  [key: string]: unknown;
}

/**
 * `gate_result.guardian_results`（与 `explain.guardian_personas` 同源只读镜像）。
 * VERIFY 后：violation_projection 下各人格 evidence_atoms 可对齐 VERIFY；llm_debate 下人格条保持 LLM 输出，
 * VERIFY 审计字段见 `GateResult.violations`。
 */
export interface GuardianGateResultsBundle {
  source?: GuardianResultsSource;
  /** true：violations / adjustments 规则投影；与 `llm_debate` + false 对照 */
  is_simulated?: boolean;
  /** 影子辩论 LLM 一句合议摘要（可选） */
  debate_summary_zh?: string;
  debate_latency_ms?: number;
  debate_shadow_wait_ms?: number;
  debate_overlapping_latency_saved_estimate_ms?: number;
  debate_shadow_triggered_at?: number;
  abu?: GuardianPersonaGateBlock;
  drdre?: GuardianPersonaGateBlock;
  dr_dre?: GuardianPersonaGateBlock;
  neptune?: GuardianPersonaGateBlock;
  /** 旧版或实验形态：列表人格块 */
  personas?: unknown[];
  items?: unknown[];
  results?: unknown[];
  guardians?: unknown[];
  [key: string]: unknown;
}

/**
 * Gate 评估结果（三人格评估结果）
 */
export interface GateResult {
  result?: string;  // 评估结果状态
  status?: string;  // 评估状态（向后兼容）
  allowed?: boolean;  // 是否允许（向后兼容 ValidateSafetyResponse）
  reason?: string;  // 评估原因
  warnings?: string[];  // 警告列表
  recommendations?: string[];  // 建议列表
  violations?: Array<{
    explanation: string;
    violation?: 'HARD' | 'SOFT' | 'NONE';
    /**
     * VERIFY（尤其 llm_debate 路径）后可挂载与 VERIFY 对齐的审计原子；
     * 与人格块上的 LLM evidence 分层，勿当作第二套 verdict。
     */
    evidence_atoms?: GuardianEvidenceAtom[];
    [key: string]: unknown;
  }>;  // 违规列表（向后兼容）
  /** 三人格结构化门控（优先于纯文本 reason） */
  guardian_results?: GuardianGateResultsBundle;
  [key: string]: unknown;  // 允许其他未知字段
}

/**
 * 错误类型
 */
export type ErrorType = 
  | 'CRITICAL_DEPENDENCY_MISSING'  // 关键依赖缺失：关键服务不可用，无法继续执行
  | 'MISSING_REQUIRED_PARAM'       // 缺少必需参数：缺少必需的信息，需要用户澄清
  | 'INSUFFICIENT_PERMISSIONS'     // 权限不足：用户没有执行该操作的权限
  | 'SERVICE_UNAVAILABLE'         // 服务不可用：外部服务暂时不可用
  | 'VALIDATION_ERROR'            // 验证错误：输入参数验证失败
  | 'TIMEOUT_ERROR'              // 超时错误：操作超时
  | 'UNKNOWN_ERROR';              // 未知错误：未分类的错误

/**
 * 重定向原因
 */
export type RedirectReason = 
  | 'READONLY_MODE_RESTRICTION'    // 只读模式限制
  | 'PLANNING_REQUEST_DETECTED'   // 检测到规划请求
  | 'INSUFFICIENT_PERMISSIONS'     // 权限不足
  | 'FEATURE_MIGRATED'            // 功能已迁移
  | 'MISSING_TRIP_ID';            // 缺少行程 ID

/**
 * 重定向信息
 */
export interface RedirectInfo {
  redirect_to: string;           // 重定向目标 URL（相对路径或绝对路径）
  redirect_reason: RedirectReason;  // 重定向原因
  original_request: {
    message: string;             // 原始请求消息（已脱敏，最多 200 字符）
    user_id: string;             // 原始用户 ID
    trip_id?: string;            // 原始行程 ID（如果存在）
  };
}

/**
 * 澄清信息（当状态为 NEED_MORE_INFO 时）
 */
export interface ClarificationInfo {
  needsUserConfirmation?: boolean;  // 是否需要用户确认
  clarificationMessage?: string;    // 用户友好的澄清消息（Markdown 格式）
  missingServices?: string[];       // 缺失的服务列表
  solutions?: string[];             // 解决方案列表
  errorType?: ErrorType;             // 错误类型
  impact?: string;                   // 影响说明（向后兼容）
  [key: string]: any;
}

/**
 * 编排步骤镜像（后端由 stepsExecuted 映射至 ui_state.steps）
 */
export interface OrchestrationUiStep {
  step_id: string;
  step_name: string;
  /** 步骤中文展示名；优先于前端对 step_name 的枚举映射 */
  step_display_zh?: string;
  skill_name?: string;
  action_name?: string;
  /** 缺省时 UI 按成功展示 */
  success?: boolean;
  duration_ms?: number;
}

/**
 * 编排 UI 状态（由 DSO/OrchestratorState 派生）
 * 用于展示进度、当前步骤、状态
 */
export interface OrchestrationUiState {
  phase?: OrchestrationStep | string;
  ui_status?: UIStatus | string;
  progress_percent?: number;
  message?: string;
  requires_user_action?: boolean;
  /** 当前步骤详情（如「请选择极光观测日（点击下方日期按钮）」） */
  current_step_detail?: string;
  /** 与 result.answer_html 同源；澄清/进度详情 HTML */
  current_step_detail_html?: string;
  /** 预计剩余时间（ms），后端可选 */
  estimated_time_remaining_ms?: number;
  /** 执行轨迹步骤列表；OrchestrationProgressCard 优先渲染 */
  steps?: OrchestrationUiStep[];
}

/**
 * 编排结果（OrchestratorState 投影）
 */
export interface OrchestrationResult {
  state?: any;
  itinerary?: any;
  gate_result?: GateResult;
  decision_log?: DecisionLogEntry[];
  /** 编排最终模式（如 **`DEDUP`** 表示去重命中，与 `observability.is_replayed` 对齐） */
  orchestration_mode_final?: string;
  /** DSO 原始对象，用于 RLHF、分析、调试（含 confidence、history、decisionMeta） */
  decisionState?: any;
}

// ==================== Evidence Bundle / Iron Shield cards (2026-04) ====================

export type VerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'PARTIAL'
  | 'STALE'
  | 'UNVERIFIED'
  | 'FAILED'
  | (string & {});

/** C1 证据包：verification + failure reason codes */
export interface EvidenceBundleDto {
  verification_status?: VerificationStatus;
  /** 证据来源标签，如 INTAKE_CLARIFICATION */
  sources?: string[];
  failure_reason_codes?: string[];
  /** 与 failure_reason_codes 对齐的中文标签（优先展示） */
  failure_reason_labels_zh?: string[];
  [key: string]: any;
}

/** Iron Shield 审计层证据卡（逻辑/审计层） */
export interface EvidenceCardDto {
  id?: string;
  title?: string;
  summary?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | (string & {});
  verification_status?: VerificationStatus;
  evidence_refs?: string[];
  failure_reason_codes?: string[];
  /** 与 failure_reason_codes 对齐的中文标签（优先展示） */
  failure_reason_labels_zh?: string[];
  [key: string]: any;
}

/** 前端可直渲染的证据卡 UI Props（后端给的展示层字段） */
export interface EvidenceCardUiDto {
  id?: string;
  title?: string;
  subtitle?: string;
  badge_text?: string;
  badge_variant?: 'default' | 'secondary' | 'destructive' | 'outline' | (string & {});
  tone?: 'neutral' | 'warn' | 'block' | 'pass' | (string & {});
  bullets?: string[];
  meta?: Record<string, any>;
  /** 点击展开的详情内容（字符串/markdown 或结构化） */
  details?: any;
  [key: string]: any;
}

/** 物理门 · 时间平移等（SuggestedHealingOptionItemDto.temporal_shift） */
export interface TemporalShiftDto {
  shift_days?: number;
  suggested_enter_at?: string;
  enter_at?: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  rationale?: string;
  kind?: string;
  condition_text?: string;
  [key: string]: unknown;
}

/** 与后端 SuggestedHealingOptionItemDto 对齐；healed_action_input 勿直接展示，仅用于整份替换 action_input */
export interface SuggestedHealingOptionItemDto {
  option_id: string;
  kind?: string;
  summary: string;
  temporal_shift?: TemporalShiftDto;
  healed_action_input: Record<string, unknown>;
  healing_one_click_action_id?: 'PREVIEW_WITH_HEALED_INPUT_V1' | string;
  [key: string]: unknown;
}

export interface PhysicalValidationViolationDto {
  code?: string;
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

/** ActionPreviewAssessmentDto + 扩展字段 */
export interface ActionPreviewAssessmentDto {
  action_id: string;
  status: 'blocked' | 'feasible' | 'requires_confirmation' | string;
  physical_validator_interrupt_mode?: 'INTERRUPT_WITH_SUGGESTION' | string;
  physical_validation?: {
    violations?: PhysicalValidationViolationDto[];
    blocking?: boolean;
    version?: string;
    [key: string]: unknown;
  };
  preconditions?: Array<{ code?: string; message?: string; [key: string]: unknown }>;
  suggested_healing_options?: SuggestedHealingOptionItemDto[];
  [key: string]: unknown;
}

/**
 * result.payload.actionExecutionPreview — 卡片/徽标/采纳 Flow（无 physical_domain 时通常不出现）
 */
export interface ActionExecutionPreviewPayload {
  status: 'OK' | 'PARTIAL' | 'FAILED' | string;
  message?: string;
  action_previews?: ActionPreviewAssessmentDto[];
  accepted_actions?: unknown[];
  requires_confirmation_count?: number;
  high_risk_count?: number;
  /** 通过预览闸后用于 Commit */
  context_signature?: string;
  [key: string]: unknown;
}

/** result.payload.actionExecution — 编排侧摘要（含 ITINERARY_ADJUST 落库态） */
export interface ActionExecutionPayload {
  mode?: 'ADVICE_ONLY' | 'SEMI_AUTO' | 'AUTO' | string;
  status?: string;
  pendingActions?: unknown[];
  requires_confirmation_count?: number;
  itinerary_adjust_auto_apply?: {
    applied?: boolean;
    reason?: string;
    deletedCount?: number;
    addedCount?: number;
    targetDateIso?: string;
  };
  [key: string]: unknown;
}

/** POST /agent/actions/preview 请求（二次预览，整份替换后的 actions） */
export interface AgentActionPreviewRequestBody {
  request_id?: string;
  trip_id: string;
  actions: Array<{
    action_id: string;
    action_input: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/** POST /agent/actions/preview 响应（可与 actionExecutionPreview 同形或扁平） */
export interface AgentActionPreviewResponseBody {
  actionExecutionPreview?: ActionExecutionPreviewPayload;
  action_previews?: ActionPreviewAssessmentDto[];
  status?: string;
  context_signature?: string;
  [key: string]: unknown;
}

/**
 * 路由并执行响应
 */
export interface RouteAndRunResponse {
  request_id: string;
  route: RouteDecision;
  ui_state?: OrchestrationUiState;
  /** HTTP 202 首包：异步委托（与轮询 task_id 对齐） */
  async_task?: RouteRunAsyncTaskDelegated;
  result: {
    status: ResultStatus;
    answer_text: string;
    /** 气泡正文优先渲染（后端装配 HTML；无则回退 answer_text） */
    answer_html?: string;
    payload?: {
      suspensionInfo?: SuspensionInfo;  // 审批挂起信息（当 status === 'NEED_CONFIRMATION' 时）
      clarificationInfo?: ClarificationInfo;  // 澄清信息（当 status === 'NEED_MORE_INFO' 时，向后兼容）
      // 新增字段
      redirectInfo?: RedirectInfo;  // 重定向信息（当 status === 'REDIRECT_REQUIRED' 时）
      /** Decision OS v1.0：当协商触发时存在 */
      negotiation_payload?: NegotiationPayload;
      /** C1 证据包：verification_status + failure_reason_codes */
      evidence_bundle?: EvidenceBundleDto;
      /** F3 过程公平性：Agent 自动发起偏好轮次 */
      process_fairness?: import('@/types/process-fairness').ProcessFairnessPayload;
      /** PDI-4 决策风格画像：Agent 自动发起行前调查 */
      decision_profiling?: import('@/types/trip-decision-profiling').DecisionProfilingPayload;
      /** 审计/逻辑层证据卡 */
      decision_metadata?: {
        evidence_cards?: EvidenceCardDto[];
        [key: string]: any;
      };
      /** 展示层证据卡 UI props（可直接渲染） */
      ui_display?: {
        evidence_cards_ui?: EvidenceCardUiDto[];
        /** tripnara.dual_track_itinerary@v1 — A 轴默认段 + B 轴预案分支 */
        dual_track_itinerary?: import('@/types/dual-track-itinerary').DualTrackItineraryPayload;
        /** tripnara.delivery_artifacts@v1 — 地图 / 工作台 / 日历 / PDF / 文字版 */
        delivery_artifacts?: import('@/types/delivery-artifacts').DeliveryArtifactsPayload;
        /** NARRATE 路段证据卡（相邻 POI 间距离/耗时/避坑） */
        leg_evidence_cards?: import('@/types/leg-evidence').LegEvidenceCard[] | import('@/types/leg-evidence').LegEvidenceCardsPayload;
        /** P2：POI 避坑卡（NARRATE RAG / enrichClientUiDisplay） */
        poi_pitfall_cards?: import('@/types/poi-pitfall').PoiPitfallCard[] | import('@/types/poi-pitfall').PoiPitfallCardsPayload;
        /** P2：航班/酒店/租车 MCP 聚合预订清单 */
        booking_cart?: import('@/types/booking-cart').BookingCartPayload;
        /** Phase-4c：抢票倒计时 / 官方预约 / 日历提醒 */
        booking_priority_list?: import('@/types/booking-priority-list').BookingPriorityListPayload;
        /** 开放世界稀疏 stub 核实任务（enrichClientUiDisplay） */
        open_world_discovery?: import('@/types/open-world-discovery').OpenWorldDiscoveryPayload;
        /** Phase-4d：多图层行程地图（POI / 住宿 / 租车） */
        unified_map_layer?: import('@/types/unified-map-layer').UnifiedMapLayerPayload;
        /** 情绪上下文投影（服务端为准） */
        emotional_context?: import('@/types/emotional-context').EmotionalContextClient;
        /** Phase-4c：暖心 TTS 口语全文 */
        voice_payload?: import('@/types/voice-payload').VoicePayload;
        /** Phase-4c：住宿健康度（人话标签，不展示 raw km） */
        accommodation_health?: import('@/types/accommodation-health').AccommodationHealthPayload;
        /** 跨 trip 共同回忆卡片 */
        shared_milestone_cards?: import('@/types/shared-milestone').SharedMilestoneUiCard[];
        /** Schema.org 发现层（SEO / 外部分摄入；规划 UI 可忽略） */
        schema_org_discovery?: import('@/types/schema-org-discovery').SchemaOrgDiscoveryPayload;
        schemaOrgDiscovery?: import('@/types/schema-org-discovery').SchemaOrgDiscoveryPayload;
        [key: string]: any;
      };
      // 澄清消息相关字段（统一在 payload 中）
      needsUserConfirmation?: boolean;
      clarificationMessage?: string;  // 向后兼容：简单字符串格式
      /** 澄清气泡专用 HTML（优先于 answer_html 展示在智能体消息区） */
      clarification_display?: { body_html?: string; bodyHtml?: string };
      /** suppress_chat_prose=true 时气泡仅展示短 answer_html/text，长文走 question_html */
      clarification_meta?: { suppress_chat_prose?: boolean; suppressChatProse?: boolean };
      clarificationQuestions?: ClarificationQuestion[];  // 结构化澄清问题（Phase 1）
      missingServices?: string[];
      solutions?: string[];
      errorType?: ErrorType;
      // 授权相关字段（当 status === 'NEED_CONSENT' 时）
      consentMessage?: string;  // 授权消息
      requiredPermissions?: string[];  // 需要的权限列表
      consentWarning?: string;  // 授权警告
      // 其他字段（System 2 Claude 动态组装时常为 []；多日列表优先读 orchestrationResult.itinerary.days）
      timeline?: any[];
      dropped_items?: any[];
      candidates?: any[];
      evidence?: any[];
      robustness?: number | null;
      /** tripnara.robustness_dashboard@v1 镜像（与 observability.robustness_dashboard 同形） */
      robustness_dashboard?: import('@/types/robustness-dashboard').RobustnessDashboardPayload;
      orchestrationResult?: OrchestrationResult;
      /**
       * 咨询可视化 Dashboard（半结构化卡片 + 地图 + 时间轴等）。
       * 与 `ui_surface: 'consultation'` 联用时由前端渲染 `ConsultationDashboard`。
       */
      consultation_dashboard?: Record<string, unknown>;
      /**
       * 完成态 UI 分区（后端显式）：咨询类 vs 规划类，避免一律展示「行程已成功」。
       * `consultation` → 前端展示咨询完成类文案；`planning` → 行程/规划成功类文案。
       */
      ui_surface?: 'consultation' | 'planning' | (string & {});
      /**
       * 航班传感器审计/新鲜度：航段 + 摘录行（与 hotels/accommodations 分轨；前端用 `FlightInventorySnapshotPanel` 独立展示）。
       * 见 `src/lib/agent-flight-inventory-payload.ts`。
       */
      flight_inventory_snapshot?: Record<string, unknown>;
      /** 实时传感器/天气等调用的可解释审计（轻量展示用） */
      live_sensor_audit?: Record<string, unknown>;
      /** 快捷操作按钮（有内容时展示；与 answer_text 独立） */
      suggested_operations?: SuggestedOperation[];
      /**
       * 物理执行预览：与 answer_text 分工——正文叙事用 answer_text，结构化/按钮/风险用本对象。
       */
      actionExecutionPreview?: ActionExecutionPreviewPayload;
      /** 编排侧 action 摘要（无物理细节）；camelCase / snake_case 视后端为准 */
      actionExecution?: ActionExecutionPayload;
      action_execution?: ActionExecutionPayload;
      action_execution_preview?: ActionExecutionPreviewPayload;
      /** L1 行程本体执行态摘要 */
      travel_ontology_state?: import('@/types/travel-ontology-state').TravelOntologyState;
      travelOntologyState?: import('@/types/travel-ontology-state').TravelOntologyState;
      /**
       * 统一执行轨迹（轻量路径）：可含 routing_task_type、decision_log、kb_rag_hit 等，
       * 与 explain / orchestration 并行下发。
       */
      unified_execution_trace?: Record<string, unknown>;
      /** RAG：DATA_LOOKUP 等路径下的引用列表（与 rag_sources 并存时可合并展示） */
      data_lookup_rag_citations?: unknown[];
      /** 知识库 RAG 引用条数（展示/调试） */
      kb_rag_citation_count?: number;
      /**
       * 安全 / 校验 / 可达「痛觉」面（v1.0）：`safetravel_route_alerts`、`verify_issues`、`smart_update`、`tagged_drive_legs`。
       * 前端见 `src/lib/safety-surface-payload.ts`；与 timeline 按 `route_segment_ref` 对齐。
       */
      safety_surface?: Record<string, unknown>;
      safetySurface?: Record<string, unknown>;
      /** P1.1：SUCCESS 但未完全 VERIFIED 的瑕疵草案描述 */
      flawed_draft_v1?: import('@/types/flawed-draft').FlawedDraftDescriptorV1;
      [key: string]: any;
    };
  };
  explain?: {
    decision_log?: DecisionLogEntry[] | DecisionLogItem[];  // 支持新旧两种格式
    /** C1 / 编排层聚合的失败原因码（可与 payload.evidence_bundle.failure_reason_codes 合并使用） */
    failure_reason_codes?: string[];
    /**
     * 三人格只读投影：与 `result.payload.orchestrationResult.gate_result.guardian_results` 同源；
     * 客户端只读展示，勿作独立可写状态。
     */
    guardian_personas?: GuardianGateResultsBundle;
    /** 摘要 + 关键决策点；勿替代 gate/narration，仅并列展示 */
    simplified_explanation?: RouteRunSimplifiedExplanation;
    /** 段编辑器 / 路线结构门控真源（每次编排 OK 后覆盖） */
    world_model_guards?: import('@/types/world-model-guards').WorldModelGuards;
    /**
     * 优化方法与裁决审计（只读辅助，snake_case）：
     * decision_verdict_narration_zh、world_constraint_materialization（applied_events 为条数）、
     * method、decision_verdict 等。需完整 OPTIMIZE/CGUS 规划流才有值。
     */
    optimization?: import('@/types/world-model-guards').RouteRunExplainOptimization;
    /** decision-cockpit@v1：由 explain.unified 投影，只读决策驾驶舱 */
    decision_cockpit?: import('@/types/decision-cockpit').DecisionCockpitDto;
    /** 内核可解释性：含 DSO 版本，写请求乐观锁与成功响应后本地 store 对齐 */
    kernel_explainability?: {
      dso_version?: string;
      [key: string]: unknown;
    };
    /** P1.1：与 payload.flawed_draft_v1 同源只读镜像 */
    flawed_draft_v1?: import('@/types/flawed-draft').FlawedDraftDescriptorV1;
    /** 级联影响 UI 卡片（snake_case，与 readiness cascadeUiHints 同形） */
    cascade_ui_hints?: import('@/types/readiness-cascade').CascadeUiHint[];
    /** 完整依赖影响结构，一般不必直接渲染 */
    dependency_impact?: Record<string, unknown>;
    /** Travel Runtime 图（节点 + 边 + trigger），专家/调试视图 */
    travel_runtime_graph?: import('@/types/travel-runtime-graph').TravelRuntimeGraph;
    travelRuntimeGraph?: import('@/types/travel-runtime-graph').TravelRuntimeGraph;
    /** L4 数据边界脚注 */
    coverage_disclosure?: import('@/types/coverage-disclosure').CoverageDisclosure;
    coverageDisclosure?: import('@/types/coverage-disclosure').CoverageDisclosure;
  };
  observability: ObservabilityMetrics;
  /**
   * 部分装配层将 observability 嵌于 meta；语义与顶层 `observability` 等价，读取时宜合并。
   */
  meta?: {
    observability?: Partial<ObservabilityMetrics>;
    [key: string]: unknown;
  };
}

/**
 * 读取 route_and_run 响应中的编排最终模式（支持 payload / orchestrationResult / state 嵌套，camelCase 兼容）。
 */
export function getRouteRunOrchestrationModeFinal(response: RouteAndRunResponse): string | undefined {
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== 'object') return undefined;
  const top = payload.orchestration_mode_final ?? payload.orchestrationModeFinal;
  if (typeof top === 'string' && top.trim()) return top.trim();
  const orch = payload.orchestrationResult as Record<string, unknown> | undefined;
  if (orch && typeof orch === 'object') {
    const fromOrch = orch.orchestration_mode_final ?? orch.orchestrationModeFinal;
    if (typeof fromOrch === 'string' && fromOrch.trim()) return fromOrch.trim();
    const state = orch.state as Record<string, unknown> | undefined;
    if (state && typeof state === 'object') {
      const fromState = state.orchestration_mode_final ?? state.orchestrationModeFinal;
      if (typeof fromState === 'string' && fromState.trim()) return fromState.trim();
    }
  }
  return undefined;
}

/**
 * 是否缓存回放 / 去重命中：**`observability.is_replayed`** 或与 **`orchestration_mode_final === 'DEDUP'`** 对齐，便于单一布尔绑 UI。
 */
export function isRouteRunCacheReplay(response: RouteAndRunResponse): boolean {
  const obs = response.observability as ObservabilityMetrics & { is_replayed?: boolean };
  if (obs?.is_replayed === true) return true;
  return getRouteRunOrchestrationModeFinal(response) === 'DEDUP';
}

/**
 * 成功响应包装
 */
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

/**
 * 处理API响应
 */
function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data) {
    console.error('[Agent API] 无效的API响应:', response);
    throw new Error('无效的API响应');
  }

  if (!response.data.success) {
    // 尝试从多个可能的位置提取错误信息
    const errorData = (response.data as ErrorResponse).error;
    const errorMessage = 
      errorData?.message || 
      errorData?.code || 
      (typeof errorData === 'string' ? errorData : null) ||
      '请求失败';
    const errorCode = errorData?.code || 'UNKNOWN_ERROR';
    
    console.error('[Agent API] API 返回错误:', {
      code: errorCode,
      message: errorMessage,
      fullError: errorData,
      fullResponse: response.data,
      responseType: typeof response.data,
      hasError: !!errorData,
    });
    
    throw new Error(errorMessage);
  }

  return response.data.data;
}

function extractAsyncTaskFromRouteRunBody(raw: unknown): RouteRunAsyncTaskDelegated | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const nested =
    o.async_task ??
    (o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>).async_task : undefined);
  if (!nested || typeof nested !== 'object') return null;
  const task = nested as Record<string, unknown>;
  const taskId = typeof task.task_id === 'string' ? task.task_id.trim() : '';
  if (!taskId) return null;
  return {
    is_async_delegated: task.is_async_delegated === true || task.is_async_delegated === 'true',
    task_id: taskId,
    poll_path: typeof task.poll_path === 'string' ? task.poll_path : undefined,
  };
}

function parseRouteAndRunResponseBody(raw: unknown): RouteAndRunResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的 route_and_run 响应');
  }
  const o = raw as Record<string, unknown>;
  if ('success' in o) {
    return handleResponse({ data: raw as ApiResponseWrapper<RouteAndRunResponse> });
  }
  if ('route' in o && 'result' in o) {
    return raw as RouteAndRunResponse;
  }
  if (o.data && typeof o.data === 'object' && 'route' in (o.data as object)) {
    return o.data as RouteAndRunResponse;
  }
  throw new Error('无效的 route_and_run 响应');
}

function routeAndRunTimeoutMs(data: RouteAndRunRequest): number {
  const sec = data.options?.max_seconds;
  if (typeof sec === 'number' && sec > 0) {
    return Math.max(15000, sec * 1000 + 5000);
  }
  return CONFIG.API.ROUTE_AND_RUN_TIMEOUT;
}

// ==================== API 实现 ====================

export const agentApi = {
  /**
   * 大一统入口：200 同步整包 或 202 + async_task（由 options.async_mode 控制）
   */
  routeAndRunInvoke: async (data: RouteAndRunRequest): Promise<RouteAndRunInvokeResult> => {
    const timeoutMs = routeAndRunTimeoutMs(data);
    const response = await apiClient.post<unknown>('/agent/route_and_run', data, {
      timeout: timeoutMs,
      validateStatus: (status) => status === 200 || status === 202,
      headers: {
        'X-Request-Id': data.request_id,
      },
    });

    if (response.status === 202) {
      const asyncTask = extractAsyncTaskFromRouteRunBody(response.data);
      if (asyncTask?.task_id) {
        return {
          kind: 'async',
          taskId: asyncTask.task_id,
          pollPath: normalizeAgentTaskPollPath(asyncTask.poll_path, asyncTask.task_id),
        };
      }
    }

    return {
      kind: 'sync',
      response: parseRouteAndRunResponseBody(response.data),
    };
  },

  /**
   * 智能体统一入口 - 路由并执行
   * POST /agent/route_and_run
   * 接口 44: 根据用户输入自动路由到 System 1 或 System 2
   */
  routeAndRun: async (data: RouteAndRunRequest): Promise<RouteAndRunResponse> => {
    try {
      console.log('[Agent API] 发送 route_and_run 请求:', {
        request_id: data.request_id,
        user_id: data.user_id,
        trip_id: data.trip_id,
        tripId: data.tripId,
        suggested_operation_payload: data.suggested_operation_payload,
        message: data.message,
        options: data.options,
      });

      const timeoutMs = routeAndRunTimeoutMs(data);

      // route_and_run：单次耗时可能远高于普通 REST（默认见 CONFIG.API.ROUTE_AND_RUN_TIMEOUT）
      const response = await apiClient.post<ApiResponseWrapper<RouteAndRunResponse>>(
        '/agent/route_and_run',
        data,
        {
          timeout: timeoutMs,
          headers: {
            'X-Request-Id': data.request_id,
          },
        }
      );

      // 详细记录响应结构，便于调试
      const hasError = response.data && !response.data.success && 'error' in response.data;
      console.log('[Agent API] 收到 route_and_run 原始响应:', {
        hasData: !!response.data,
        success: response.data?.success,
        hasError: hasError,
        responseKeys: response.data ? Object.keys(response.data) : [],
        fullResponse: response.data,
      });

      // 如果响应格式不符合预期，尝试直接返回
      if (response.data && !('success' in response.data)) {
        // 响应可能直接是 RouteAndRunResponse，而不是包装在 ApiResponseWrapper 中
        console.warn('[Agent API] 响应格式不符合预期，尝试直接解析:', response.data);
        // 检查是否包含 route 和 result 字段（RouteAndRunResponse 的特征）
        if ('route' in response.data && 'result' in response.data) {
          const directResponse = response.data as RouteAndRunResponse;
          console.log('[Agent API] 直接解析响应成功:', {
            request_id: directResponse.request_id,
            route: directResponse.route?.route,
            status: directResponse.result?.status,
            answer_text: directResponse.result?.answer_text,
          });
          return directResponse;
        }
      }

      // 处理包装在 ApiResponseWrapper 中的响应
      const wrappedResponse = handleResponse(response);
      console.log('[Agent API] 解析后的响应:', {
        request_id: wrappedResponse.request_id,
        route: wrappedResponse.route?.route,
        status: wrappedResponse.result?.status,
        answer_text: wrappedResponse.result?.answer_text,
      });

      return wrappedResponse;
    } catch (error: any) {
      console.error('[Agent API] route_and_run 请求失败:', {
        error,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        request: {
          request_id: data.request_id,
          user_id: data.user_id,
          trip_id: data.trip_id,
        },
      });

      // 确保 Axios 错误消息能够正确传播
      // client.ts 的拦截器已经设置了 error.message，直接抛出即可
      if (error.message) {
        throw error;
      }
      // 如果没有消息，创建一个友好的错误消息
      if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请检查后端服务是否正常运行');
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到后端服务，请确认后端服务是否在运行');
      } else {
        throw new Error(error.message || '请求失败，请稍后重试');
      }
    }
  },

  /**
   * 异步发起行程规划（请求体与同步 route_and_run 相同）
   * POST /agent/route_and_run/async
   */
  routeAndRunAsync: async (data: RouteAndRunRequest): Promise<RouteRunAsyncTaskStatusResponse> => {
    const response = await apiClient.post<
      ApiResponseWrapper<RouteRunAsyncTaskStatusResponse> | RouteRunAsyncTaskStatusResponse
    >('/agent/route_and_run/async', data, {
      timeout: 30000,
      headers: {
        'X-Request-Id': data.request_id,
      },
    });

    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      return handleResponse({ data: body as ApiResponseWrapper<RouteRunAsyncTaskStatusResponse> });
    }
    if (body && typeof body === 'object' && 'task_id' in body) {
      return body as RouteRunAsyncTaskStatusResponse;
    }
    throw new Error('无效的异步 route_and_run 响应');
  },

  /**
   * 轮询异步任务状态
   * GET /agent/task/status/{task_id}
   */
  getRouteRunTaskStatus: async (taskId: string): Promise<RouteRunAsyncTaskStatusResponse> => {
    return agentApi.getRouteRunTaskStatusByPath(
      `/agent/task/status/${encodeURIComponent(taskId)}`
    );
  },

  getRouteRunTaskStatusByPath: async (
    pollPath: string
  ): Promise<RouteRunAsyncTaskStatusResponse> => {
    const path = pollPath.startsWith('/') ? pollPath : `/${pollPath}`;
    const response = await apiClient.get<
      ApiResponseWrapper<RouteRunAsyncTaskStatusResponse> | RouteRunAsyncTaskStatusResponse
    >(path, {
      timeout: 15000,
    });

    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      return attachTaskLeaseToSnapshot(
        handleResponse({ data: body as ApiResponseWrapper<RouteRunAsyncTaskStatusResponse> })
      );
    }
    if (body && typeof body === 'object' && 'task_id' in body) {
      return attachTaskLeaseToSnapshot(body as RouteRunAsyncTaskStatusResponse);
    }
    throw new Error('无效的任务状态响应');
  },

  /**
   * 显式续跑 STALE Worker（与 poll 自动 resume 等价）
   * POST /agent/task/resume/{task_id}
   */
  resumeRouteRunTask: async (
    taskId: string
  ): Promise<{ task_id: string; resumed?: boolean }> => {
    const path = `/agent/task/resume/${encodeURIComponent(taskId)}`;
    const response = await apiClient.post<
      ApiResponseWrapper<{ task_id: string; resumed?: boolean }> | { task_id: string; resumed?: boolean }
    >(path, {}, { validateStatus: (s) => s === 200 || s === 202 });

    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      return handleResponse({
        data: body as ApiResponseWrapper<{ task_id: string; resumed?: boolean }>,
      });
    }
    if (body && typeof body === 'object' && 'task_id' in body) {
      return body as { task_id: string; resumed?: boolean };
    }
    return { task_id: taskId, resumed: true };
  },

  /**
   * 行程规划异步路径：POST async + 轮询至 SUCCESS，返回与同步 route_and_run 相同整包。
   */
  routeAndRunWithPolling: async (
    data: RouteAndRunRequest,
    options?: RouteAndRunWithPollingOptions
  ): Promise<RouteAndRunResponse> => {
    const invoked = await agentApi.routeAndRunInvoke({
      ...data,
      options: {
        ...data.options,
        async_mode: data.options?.async_mode ?? 'FORCE',
      },
    });

    if (invoked.kind === 'sync') {
      return invoked.response;
    }

    return awaitRouteAndRunTaskCompletion(invoked.taskId, {
      signal: options?.signal,
      onProgress: options?.onProgress,
      pollPath: invoked.pollPath,
      getTaskStatus: () => agentApi.getRouteRunTaskStatusByPath(invoked.pollPath),
    });
  },

  /**
   * 用户确认协商方案（commit 决策）
   * POST /agent/confirm_negotiation
   */
  confirmNegotiation: async (data: ConfirmNegotiationRequest): Promise<ConfirmNegotiationResponse> => {
    const sessionId = data.negotiation_id ?? data.session_id;
    if (!sessionId) {
      throw new Error('negotiation_id/session_id is required');
    }
    const requestBody: Record<string, any> = {
      expected_negotiation_hash: data.expected_negotiation_hash,
    };
    // 同时兼容新旧后端字段，避免联调阶段因命名差异失败
    requestBody.negotiation_id = sessionId;
    requestBody.session_id = sessionId;
    if (data.trip_id) requestBody.trip_id = data.trip_id;
    if (data.alternative_id) requestBody.alternative_id = data.alternative_id;
    if (data.resolution) requestBody.resolution = data.resolution;

    const correlationId =
      data.request_id?.trim() ||
      (data.trip_id ? `${data.trip_id}:${sessionId}` : sessionId);

    const response = await apiClient.post<ApiResponseWrapper<ConfirmNegotiationResponse>>(
      '/agent/confirm_negotiation',
      requestBody,
      {
        headers: {
          'X-Request-Id': correlationId,
        },
      }
    );

    if (response.data && !('success' in response.data)) {
      return response.data as unknown as ConfirmNegotiationResponse;
    }
    return handleResponse(response);
  },

  /**
   * 决策时间轴：读取某 trip 的 revision 链
   * GET /agent/trip/:tripId/itinerary_revision_timeline
   */
  getItineraryRevisionTimeline: async (tripId: string): Promise<ItineraryRevisionTimelineResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<ItineraryRevisionTimelineResponse>>(
      `/agent/trip/${encodeURIComponent(tripId)}/itinerary_revision_timeline`
    );
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as ItineraryRevisionTimelineResponse;
    }
    return handleResponse(response);
  },

  /**
   * 行程鲁棒性 Dashboard（缓存 + 可选强制重算）
   * GET /agent/trip/:tripId/robustness_dashboard
   * GET /agent/trip/:tripId/robustness_dashboard?recompute=1
   */
  getTripRobustnessDashboard: async (
    tripId: string,
    options?: { recompute?: boolean }
  ): Promise<import('@/types/robustness-dashboard').TripRobustnessDashboardResponse> => {
    const params = options?.recompute ? { recompute: 1 } : undefined;
    const response = await apiClient.get<
      ApiResponseWrapper<import('@/types/robustness-dashboard').TripRobustnessDashboardResponse>
    >(`/agent/trip/${encodeURIComponent(tripId)}/robustness_dashboard`, { params });
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as import('@/types/robustness-dashboard').TripRobustnessDashboardResponse;
    }
    return handleResponse(response);
  },

  /**
   * 单条 revision 详情
   * GET /agent/negotiation_revision/:revisionId
   */
  getNegotiationRevision: async (revisionId: string): Promise<NegotiationRevisionResponse> => {
    const response = await apiClient.get<ApiResponseWrapper<NegotiationRevisionResponse>>(
      `/agent/negotiation_revision/${encodeURIComponent(revisionId)}`
    );
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as NegotiationRevisionResponse;
    }
    return handleResponse(response);
  },

  /**
   * 回滚（Time Machine）：把行程回滚到某个历史 revision 的 snapshot
   * POST /agent/rollback
   */
  rollback: async (data: RollbackRequest): Promise<RollbackResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<RollbackResponse>>('/agent/rollback', data, {
      headers: data.request_id ? { 'X-Request-Id': data.request_id } : undefined,
    });
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as RollbackResponse;
    }
    return handleResponse(response);
  },

  /**
   * 回滚到指定 revision（与 /agent/rollback 对应的变体）
   * POST /agent/rollback_to_revision
   */
  rollbackToRevision: async (data: RollbackRequest): Promise<RollbackResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<RollbackResponse>>('/agent/rollback_to_revision', data, {
      headers: data.request_id ? { 'X-Request-Id': data.request_id } : undefined,
    });
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as RollbackResponse;
    }
    return handleResponse(response);
  },

  /**
   * Decision DNA / Audit log（best-effort，不影响主流程）
   * POST /agent/log_decision
   */
  logDecision: async (data: LogDecisionRequest): Promise<LogDecisionResponse> => {
    const response = await apiClient.post<ApiResponseWrapper<LogDecisionResponse>>('/agent/log_decision', data);
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as LogDecisionResponse;
    }
    return handleResponse(response);
  },

  /**
   * 决策回放时间轴
   * GET /v1/decision-replay/timeline/:tripRunId
   */
  getDecisionReplayTimeline: async (tripRunId: string): Promise<DecisionReplayTimelineResponse> => {
    const normalizedTripRunId = tripRunId?.trim();
    if (!normalizedTripRunId) {
      throw new Error('tripRunId is required');
    }
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('未登录或登录已过期：Decision Replay 需要 JWT');
    }

    try {
      const response = await apiClient.get<ApiResponseWrapper<DecisionReplayTimelineResponse>>(
        `/v1/decision-replay/timeline/${encodeURIComponent(normalizedTripRunId)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.data && !('success' in response.data)) {
        return response.data as unknown as DecisionReplayTimelineResponse;
      }
      return handleResponse(response);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        throw new Error('401 Unauthorized：Decision Replay 需要有效 JWT');
      }
      if (status === 404) {
        throw new Error('404 Cannot GET：请检查 DecisionReplayController 是否已注册及路由路径是否正确');
      }
      throw error;
    }
  },

  /**
   * what-if 推演
   * POST /v1/decision-replay/what-if
   */
  decisionReplayWhatIf: async (data: DecisionReplayWhatIfRequest): Promise<DecisionReplayWhatIfResponse> => {
    const normalizedTripRunId = data?.trip_run_id?.trim();
    if (!normalizedTripRunId) {
      throw new Error('trip_run_id is required');
    }
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('未登录或登录已过期：Decision Replay 需要 JWT');
    }

    try {
      const response = await apiClient.post<ApiResponseWrapper<DecisionReplayWhatIfResponse>>(
        '/v1/decision-replay/what-if',
        {
          ...data,
          trip_run_id: normalizedTripRunId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.data && !('success' in response.data)) {
        return response.data as unknown as DecisionReplayWhatIfResponse;
      }
      return handleResponse(response);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        throw new Error('401 Unauthorized：Decision Replay 需要有效 JWT');
      }
      if (status === 404) {
        throw new Error('404 Cannot GET：请检查 DecisionReplayController 是否已注册及路由路径是否正确');
      }
      throw error;
    }
  },

  /**
   * 反事实分析
   * POST /v1/decision-replay/counterfactual/:tripRunId
   */
  decisionReplayCounterfactual: async (
    tripRunId: string,
    data: DecisionReplayCounterfactualRequest
  ): Promise<DecisionReplayCounterfactualResponse> => {
    const normalizedTripRunId = tripRunId?.trim();
    if (!normalizedTripRunId) {
      throw new Error('tripRunId is required');
    }
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('未登录或登录已过期：Decision Replay 需要 JWT');
    }

    try {
      const response = await apiClient.post<ApiResponseWrapper<DecisionReplayCounterfactualResponse>>(
        `/v1/decision-replay/counterfactual/${encodeURIComponent(normalizedTripRunId)}`,
        data ?? {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.data && !('success' in response.data)) {
        return response.data as unknown as DecisionReplayCounterfactualResponse;
      }
      return handleResponse(response);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        throw new Error('401 Unauthorized：Decision Replay 需要有效 JWT');
      }
      if (status === 404) {
        throw new Error('404 Cannot GET：请检查 DecisionReplayController 是否已注册及路由路径是否正确');
      }
      throw error;
    }
  },

  /**
   * 约束元数据（主路径）
   * GET /agent/route_and_run/constraints-meta
   */
  getConstraintsMeta: async (): Promise<ConstraintsMetaResponse> => {
    const primary = '/agent/route_and_run/constraints-meta';
    const fallback = '/agent/meta/transport-modes';
    try {
      const response = await apiClient.get<ApiResponseWrapper<ConstraintsMetaResponse>>(primary);
      if (response.data && !('success' in response.data)) {
        return response.data as unknown as ConstraintsMetaResponse;
      }
      return handleResponse(response);
    } catch (error: any) {
      // 兼容别名路径
      if (error?.response?.status === 404) {
        const response = await apiClient.get<ApiResponseWrapper<ConstraintsMetaResponse>>(fallback);
        if (response.data && !('success' in response.data)) {
          return response.data as unknown as ConstraintsMetaResponse;
        }
        return handleResponse(response);
      }
      throw error;
    }
  },

  /**
   * Decision Replay 会话列表
   * GET /v1/decision-replay/sessions
   */
  getDecisionReplaySessions: async (params?: { trip_id?: string }): Promise<DecisionReplaySessionsResponse> => {
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      throw new Error('未登录或登录已过期：Decision Replay 需要 JWT');
    }
    try {
      const response = await apiClient.get<ApiResponseWrapper<DecisionReplaySessionsResponse>>(
        '/v1/decision-replay/sessions',
        {
          params: params?.trip_id ? { trip_id: params.trip_id } : undefined,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.data && !('success' in response.data)) {
        return response.data as unknown as DecisionReplaySessionsResponse;
      }
      return handleResponse(response);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        throw new Error('401 Unauthorized：Decision Replay 需要有效 JWT');
      }
      if (status === 404) {
        throw new Error('404：sessions 路由未注册或路径错误');
      }
      throw error;
    }
  },

  /**
   * P2+ 预订清单 checkout 状态机
   * POST /agent/booking_cart/apply
   */
  applyBookingCartAction: async (
    data: import('@/types/booking-cart').BookingCartApplyRequest
  ): Promise<import('@/types/booking-cart').BookingCartApplyResponse> => {
    const response = await apiClient.post<
      ApiResponseWrapper<import('@/types/booking-cart').BookingCartApplyResponse>
    >('/agent/booking_cart/apply', data);
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as import('@/types/booking-cart').BookingCartApplyResponse;
    }
    return handleResponse(response);
  },

  /**
   * 开放世界核实回写（mark_verified 等）
   * POST /agent/open_world_verification/apply
   */
  applyOpenWorldVerification: async (
    data: import('@/types/open-world-discovery').OpenWorldVerificationApplyRequest
  ): Promise<import('@/types/open-world-discovery').OpenWorldVerificationApplyResponse> => {
    const response = await apiClient.post<
      ApiResponseWrapper<
        import('@/types/open-world-discovery').OpenWorldVerificationApplyResponse
      >
    >('/agent/open_world_verification/apply', data);
    if (response.data && !('success' in response.data)) {
      return response.data as unknown as import('@/types/open-world-discovery').OpenWorldVerificationApplyResponse;
    }
    return handleResponse(response);
  },
};
