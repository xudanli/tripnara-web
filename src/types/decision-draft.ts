/**
 * 决策草案相关类型定义
 * 用于 TripNARA 可视化决策编排工具
 */

import type { GateStatus } from '@/lib/gate-status';

// ==================== 基础类型 ====================

export type UserMode = 'toc' | 'expert' | 'studio';

export type DecisionType =
  | 'transport-decision'
  | 'pace-decision'
  | 'poi-selection'
  | 'accommodation-decision'
  | 'timing-decision'
  | 'budget-decision'
  | 'safety-decision'
  | 'preference-decision'
  | 'other';

export type DecisionStepStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export type OrchestrationStep =
  | 'INTAKE'
  | 'RESEARCH'
  | 'GATE_EVAL'
  | 'PLAN_GEN'
  | 'VERIFY'
  | 'REPAIR'
  | 'NARRATE';

export type SubAgentType =
  | 'Planner'
  | 'Gatekeeper'
  | 'CoreDecision'
  | 'LocalInsight'
  | 'Narrator';

export type UserFeedbackAction = 'approve' | 'reject' | 'modify';

// ==================== 决策步骤输入输出 ====================

export interface DecisionStepInput {
  name: string;
  value: any;
  source?: string; // 数据来源
  confidence?: number; // 0-1
}

export interface DecisionStepOutput {
  name: string;
  value: any;
  type?: string; // 输出类型
  confidence?: number; // 0-1
}

// ==================== 证据引用 ====================

export interface EvidenceRef {
  evidence_id: string;
  source_title: string;
  source_url?: string;
  publisher?: string;
  published_at?: string;
  retrieved_at: string;
  data_timestamp?: string;
  excerpt: string;
  relevance: number; // 0-1
  confidence: number; // 0-1
  related_decision_ids: string[];
}

// ==================== 决策日志 ====================

export interface DecisionLogEntry {
  timestamp: string;
  agent?: SubAgentType;
  action: string; // 操作类型
  reasoning?: string; // 推理过程
  inputs?: any; // 输入数据
  outputs?: any; // 输出数据
  confidence?: number; // 0-1
}

// ==================== 三人格评审 ====================

export interface GuardianReview {
  status: 'approve' | 'reject' | 'suggest_modify';
  reasoning?: string;
  confidence?: number; // 0-1
  concerns?: string[]; // 关注点列表
}

export interface GuardianReviews {
  abu?: GuardianReview;
  dr_dre?: GuardianReview;
  neptune?: GuardianReview;
}

// ==================== 用户反馈 ====================

export interface UserFeedback {
  action: UserFeedbackAction;
  reasoning?: string;
  timestamp?: string;
  user_id?: string;
}

// ==================== 决策步骤 ====================

export interface DecisionStep {
  id: string;
  title: string;
  description: string;
  type: DecisionType;
  status: DecisionStepStatus;
  confidence: number; // 0-1

  // 输入输出
  inputs: DecisionStepInput[];
  outputs: DecisionStepOutput[];

  // 证据和决策日志
  evidence: EvidenceRef[];
  decision_log: DecisionLogEntry[];

  // 关联的Step Drafts（技术层）
  step_draft_ids: string[];
  step_drafts?: TripNARAStepDraft[]; // Expert模式可见

  // 状态机集成字段
  orchestration_step?: OrchestrationStep;
  sub_agent?: SubAgentType;
  skills_used?: string[]; // Skills列表

  // 三人格评审（如果适用）
  guardian_review?: GuardianReviews;

  // 用户交互
  user_feedback?: UserFeedback;

  // 元数据
  created_at: string;
  updated_at: string;
}

// ==================== Step Draft（技术层） ====================

export interface TripNARAStepDraft {
  step_draft_id: string;
  step_type: string;
  inputs: any;
  outputs: any;
  metadata?: any;
}

export interface TripNARAWorkflowDraft {
  workflow_draft_id: string;
  steps: TripNARAStepDraft[];
  metadata?: any;
}

// ==================== 决策草案 ====================

export interface DecisionDraftMetadata {
  decision_count: number;
  step_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionDraft {
  draft_id: string;
  plan_id: string;
  plan_version: number;

  // 决策步骤（业务层）
  decision_steps: DecisionStep[];

  // 步骤草案（技术层，关联）
  step_draft_id?: string;
  step_draft?: TripNARAWorkflowDraft; // Expert模式可见

  // 用户模式
  user_mode: UserMode;

  // Studio模式特有字段
  debug_info?: DecisionDebugInfo;

  // 元数据
  metadata: DecisionDraftMetadata;
}

// ==================== 调试信息（Studio模式） ====================

export interface LLMCall {
  call_id: string;
  timestamp: string;
  model: string;
  prompt: string;
  response: string;
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number; // USD
  latency_ms?: number;
}

export interface SkillCall {
  call_id: string;
  timestamp: string;
  skill_name: string;
  parameters: any;
  response: any;
  latency_ms?: number;
  success: boolean;
  error?: string;
}

export interface PerformanceMetrics {
  generation_time_ms: number; // 生成时间
  execution_time_ms: number; // 执行时间
  success_rate: number; // 0-1
  total_cost_usd?: number; // 总成本
  llm_calls_count: number;
  skill_calls_count: number;
}

export interface DecisionDebugInfo {
  llm_calls: LLMCall[];
  skill_calls: SkillCall[];
  performance_metrics: PerformanceMetrics;
  optimization_suggestions?: string[];
}

// ==================== 决策解释 ====================

// ToC模式解释
export interface TocExplanation {
  summary: string; // 自然语言摘要
  decision_count: number;
  key_decisions: DecisionStep[]; // 关键决策（5-7个）
  key_evidence: EvidenceRef[]; // 关键证据
}

// Expert模式解释
export interface ExpertExplanation {
  summary: string;
  decision_steps: DecisionStep[];
  step_drafts: TripNARAStepDraft[]; // 完整Step Drafts
  evidence_chain: EvidenceRef[]; // 完整证据链
  decision_log: DecisionLogEntry[]; // 决策日志
}

// Studio模式解释
export interface StudioExplanation extends ExpertExplanation {
  llm_calls: LLMCall[]; // LLM调用详情
  skill_calls: SkillCall[]; // Skill调用详情
  performance_metrics: PerformanceMetrics; // 性能指标
  optimization_suggestions: string[]; // 优化建议
}

export type DecisionExplanation = TocExplanation | ExpertExplanation | StudioExplanation;

// ==================== 影响预览 ====================

export interface ImpactPreviewResult {
  affected_steps: string[]; // 受影响的决策步骤ID列表
  affected_evidence: string[]; // 受影响的证据ID列表
  impact_summary: string; // 影响摘要
  confidence_change: number; // 置信度变化
}

// ==================== 决策回放 ====================

export interface ReplayTimelineItem {
  timestamp: string;
  step: OrchestrationStep;
  decision_step?: DecisionStep;
  evidence_added?: EvidenceRef[];
  decision_made?: DecisionLogEntry;
}

export interface DecisionReplay {
  timeline: ReplayTimelineItem[];
  duration_ms: number;
}

// ==================== 版本管理 ====================

export interface DecisionDraftVersion {
  version_id: string;
  draft_id: string;
  version_number: number;
  created_at: string;
  created_by?: string;
  description?: string;
  decision_steps: DecisionStep[];
  metadata?: any;
}

export interface VersionListResponse {
  versions: DecisionDraftVersion[];
}

export interface VersionDetailResponse {
  version: DecisionDraftVersion;
}

export interface VersionDiff {
  decision_steps_added: DecisionStep[];
  decision_steps_removed: DecisionStep[];
  decision_steps_modified: DecisionStep[];
}

export interface VersionCompareResponse {
  version1: DecisionDraftVersion;
  version2: DecisionDraftVersion;
  diff: VersionDiff;
}

// ==================== API 请求类型 ====================

export interface UpdateDecisionStepRequest {
  title?: string;
  description?: string;
  status?: GateStatus; // 决策状态
  confidence?: number;
  outputs?: DecisionStepOutput[];
  user_feedback?: {
    action: UserFeedbackAction;
    reasoning?: string;
  };
}

export interface PreviewImpactRequest {
  step_id: string;
  new_value: any;
}

export interface GenerateDecisionDraftRequest {
  plan_id: string;
  plan_version?: number;
  user_mode?: UserMode;
}

export interface BatchUpdateStepsRequest {
  updates: Array<{
    step_id: string;
    updates: UpdateDecisionStepRequest;
  }>;
}

export interface ReorderStepsRequest {
  step_ids: string[]; // 新的顺序
}

export interface CreateVersionRequest {
  description?: string;
}

// ==================== API 响应类型 ====================

export interface GetDecisionDraftResponse {
  draft: DecisionDraft;
}

export interface GetExplanationResponse {
  explanation: DecisionExplanation;
}

export interface UpdateStepResponse {
  step: DecisionStep;
}

export interface PreviewImpactResponse {
  impact: ImpactPreviewResult;
}

export interface GetReplayResponse {
  replay: DecisionReplay;
}

export interface GetVersionsResponse {
  versions: DecisionDraftVersion[];
}

export interface GetVersionDetailResponse {
  version: DecisionDraftVersion;
}

export interface GetVersionCompareResponse {
  version1: DecisionDraftVersion;
  version2: DecisionDraftVersion;
  diff: VersionDiff;
}

export interface GenerateDraftResponse {
  draft: DecisionDraft;
}

export interface GetDebugInfoResponse {
  debug_info: DecisionDebugInfo;
}

export interface GetStatsResponse {
  total_drafts: number;
  total_decisions: number;
  average_confidence: number;
  success_rate: number;
}
