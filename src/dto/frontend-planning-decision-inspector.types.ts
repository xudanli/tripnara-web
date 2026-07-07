import type { PlanningCausalChain } from '@/dto/frontend-planning-causal-chain.types';
import type { PlanningDecisionBasis } from '@/dto/frontend-planning-decision-basis.types';

export type InspectorImpactTagTone = 'good' | 'caution' | 'risk' | 'muted' | 'neutral' | (string & {});

export type InspectorGateCheckStatus = 'pass' | 'warn' | 'fail' | (string & {});

export type InspectorMemberStance = 'support' | 'objection' | 'neutral' | 'pending' | (string & {});

export type InspectorFeasibilityVerdictStatus = 'feasible' | 'blocked' | 'caution' | (string & {});

export interface PlanningDecisionInspectorPlanDiffRow {
  id: string;
  itemLabel: string;
  before: string;
  after: string;
  deltaLabel: string;
  deltaMinutes?: number;
}

export interface PlanningDecisionInspectorImpactTag {
  id: string;
  label: string;
  tone: InspectorImpactTagTone;
}

export interface PlanningDecisionInspectorTimelineMilestone {
  id: string;
  label: string;
  originalTime: string;
  newTime: string;
  deltaMinutes?: number;
  durationAfterMinutes?: number;
  /** ④ 原计划轨节点间隔；与 durationAfterMinutes 相同时可省略 */
  originalDurationAfterMinutes?: number;
}

export interface PlanningDecisionInspectorTimelineCompare {
  milestones: PlanningDecisionInspectorTimelineMilestone[];
  bannerText?: string;
  /** 降级文案，非设计稿必显 */
  summary?: string;
}

export interface PlanningDecisionInspectorPlanDiff {
  optionBadge?: string;
  optionTitle?: string;
  changeRows: PlanningDecisionInspectorPlanDiffRow[];
  impactTags: PlanningDecisionInspectorImpactTag[];
  unchangedItems: string[];
  timelineCompare?: PlanningDecisionInspectorTimelineCompare;
}

export interface PlanningDecisionInspectorMemberOpinion {
  id: string;
  displayName: string;
  stance: InspectorMemberStance;
  comment?: string;
}

export interface PlanningDecisionInspectorMemberAssessment {
  supportPercent?: number;
  statusMessage?: string;
  canCreatorConfirm?: boolean;
}

export interface PlanningDecisionInspectorMemberConsensus {
  summaryBar?: string;
  supportCount?: number;
  objectionCount?: number;
  pendingCount?: number;
  opinions: PlanningDecisionInspectorMemberOpinion[];
  aiSummary: string[];
  assessment?: PlanningDecisionInspectorMemberAssessment;
}

export interface PlanningDecisionInspectorGateCheck {
  id: string;
  label: string;
  status: InspectorGateCheckStatus;
}

export interface PlanningDecisionInspectorValidityWarning {
  message?: string;
  retriggerCondition?: string;
}

export interface PlanningDecisionInspectorExecutionSummaryItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

export interface PlanningDecisionInspectorVerdict {
  status: InspectorFeasibilityVerdictStatus;
  message: string;
  subtext?: string;
}

export interface PlanningDecisionInspectorFeasibility {
  canSafelyWrite: boolean;
  headline?: string;
  optionBadge?: string;
  optionTitle?: string;
  gateChecks: PlanningDecisionInspectorGateCheck[];
  validityWarning?: PlanningDecisionInspectorValidityWarning;
  executionSummary: PlanningDecisionInspectorExecutionSummaryItem[];
  verdict?: PlanningDecisionInspectorVerdict;
}

export type PlanningDecisionInspectorMode = 'problem' | 'proposal' | (string & {});

export interface PlanningDecisionInspectorTabEmptyState {
  causalChain: boolean;
  planDiff: boolean;
  memberConsensus: boolean;
  feasibility: boolean;
}

export interface PlanningDecisionInspectorFetchParams {
  proposalId?: string;
  problemId?: string;
  optionId?: string;
  conflictId?: string;
}

export interface PlanningDecisionInspector {
  schema: 'tripnara.planning_decision_inspector@v1' | (string & {});
  tripId: string;
  mode?: PlanningDecisionInspectorMode;
  proposalId?: string;
  problemId?: string;
  optionId?: string;
  conflictId?: string;
  tabEmptyState?: PlanningDecisionInspectorTabEmptyState;
  refreshUrl?: string;
  decisionBasis?: PlanningDecisionBasis;
  causalChain?: PlanningCausalChain;
  planDiff?: PlanningDecisionInspectorPlanDiff;
  memberConsensus?: PlanningDecisionInspectorMemberConsensus;
  feasibility?: PlanningDecisionInspectorFeasibility;
}
