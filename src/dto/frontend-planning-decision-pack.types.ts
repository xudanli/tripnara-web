/** tripnara.planning_decision_pack@v1 — P0/P1 前端 SSOT */

export type PlanningDecisionOptionKind =
  | 'SHIFT_EARLIER'
  | 'SHORTEN_STAY'
  | 'SHIFT_LATER'
  | 'ACCEPT_RISK'
  | (string & {});

export type PlanningDecisionImpactScopeKind =
  | 'DAY'
  | 'TRIP'
  | 'CANDIDATE_POOL'
  | 'ITEM'
  | (string & {});

export type PlanningDecisionDiagnosticSource =
  | 'trip_conflicts'
  | 'feasibility'
  | 'validation'
  | (string & {});

export interface PlanningDecisionImpactScope {
  scope: PlanningDecisionImpactScopeKind;
  affectedDays?: number[];
  itemIds?: string[];
  candidateIds?: string[];
  placeIds?: number[];
}

export interface PlanningDecisionCounterfactualRow {
  id: string;
  label: string;
  before: string;
  after: string;
}

export interface PlanningDecisionActionPayload {
  source?: PlanningDecisionDiagnosticSource;
  conflictId?: string;
  [key: string]: unknown;
}

export interface PlanningDecisionActionRef {
  type: string;
  proposalId?: string;
  actionId?: string;
  payload?: PlanningDecisionActionPayload;
  [key: string]: unknown;
}

export type PlanningDecisionOptionItemTone = 'good' | 'caution' | 'risk' | 'neutral' | (string & {});

export type PlanningDecisionDataBasisIconKey =
  | 'time'
  | 'calendar'
  | 'route'
  | 'member'
  | 'users'
  | 'no_route'
  | 'eye'
  | 'risk'
  | 'warning'
  | 'traffic'
  | 'checkpoint'
  | 'sensor'
  | 'weather'
  | 'history'
  | (string & {});

export type PlanningDecisionDataBasisReliability = 'high' | 'medium' | 'low';

export interface PlanningDecisionOutcomeItem {
  id?: string;
  text: string;
  tone?: PlanningDecisionOptionItemTone;
}

export interface PlanningDecisionCostItem {
  id?: string;
  text: string;
  tone?: PlanningDecisionOptionItemTone;
}

export interface PlanningDecisionDataBasisItem {
  id?: string;
  icon: PlanningDecisionDataBasisIconKey;
  label: string;
  reliability?: PlanningDecisionDataBasisReliability;
}

/** P0 — 方案 / action 结果卡（PlanningDecisionOption） */
export interface PlanningDecisionPackOption {
  id: string;
  optionKind: PlanningDecisionOptionKind;
  /** 兼容旧客户端；展示优先 headline */
  title: string;
  /** 「方案 A」角标，如 "方案 A" */
  badge?: string;
  letter?: string;
  /** 主标题 */
  headline?: string;
  /** 副文案 */
  description?: string;
  recommended?: boolean;
  /** 与 outcomeItems 同步 */
  outcomes: string[];
  /** 与 costItems 同步 */
  costs: string[];
  outcomeItems?: PlanningDecisionOutcomeItem[];
  costItems?: PlanningDecisionCostItem[];
  /** 数据依据 / 影响范围 footer */
  dataBasis?: PlanningDecisionDataBasisItem[];
  impactScope?: PlanningDecisionImpactScope;
  counterfactualRows?: PlanningDecisionCounterfactualRow[];
  action?: PlanningDecisionActionRef;
  systemJudgment?: string;
}

/** @alias PlanningDecisionPackOption */
export type PlanningDecisionOption = PlanningDecisionPackOption;

/** 与 GET /trips/:id/conflicts 对齐的诊断项 */
export interface PlanningDecisionDiagnostic {
  id: string;
  source?: PlanningDecisionDiagnosticSource;
  conflictId?: string;
  title: string;
  message?: string;
  dayIndex?: number;
  severity?: 'info' | 'warn' | 'block';
}

/** P1 — 决策簇 */
export interface PlanningDecisionCluster {
  id: string;
  title: string;
  dayNumbers?: number[];
  diagnosticCount: number;
  decisionId: string;
  dependsOn?: string[];
  resolvesCount?: number;
  processingKind?: string;
  processingLabel?: string;
  options: PlanningDecisionPackOption[];
}

/** 快照 / 列表用簇摘要 */
export interface PlanningDecisionClusterSummary {
  id: string;
  title: string;
  dayNumbers?: number[];
  diagnosticCount?: number;
  decisionId?: string;
  dependsOn?: string[];
  resolvesCount?: number;
  representativeOptionId?: string;
  processingLabel?: string;
}

export interface PlanningDecisionPack {
  schema: 'tripnara.planning_decision_pack@v1' | (string & {});
  options?: PlanningDecisionPackOption[];
  decisionClusters?: PlanningDecisionCluster[];
  diagnostics?: PlanningDecisionDiagnostic[];
  validUntil?: string;
  validityConstraint?: string;
}

export type PlanningDecisionExecutionStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface PlanningDecisionExecutionStep {
  id: string;
  label: string;
  status: PlanningDecisionExecutionStepStatus;
}

export interface PlanningProposalMonitorView {
  validUntil?: string;
  contextVersion: number;
  isStale: boolean;
  monitorWebhookUrl?: string;
  staleReason?: string;
}
