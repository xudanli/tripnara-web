import type { ApplyRepairResponse } from '@/types/feasibility-repair';
import type { FeasibilityVerdictStatus } from '@/types/trip-feasibility-report';

/** Loop run lifecycle — orthogonal to Trip.status */
export type LoopRunStatus =
  | 'RUNNING'
  | 'WAITING_FOR_HUMAN'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED';

/**
 * 后端运行态枚举（审计/编排）。与 ui.phase 不一一对应；
 * GET latest 重建值不可靠 — C 端渲染只用 ui.phase。
 */
export type LoopRuntimeState =
  | 'IDLE'
  | 'VALIDATING'
  | 'WAITING_FOR_HUMAN'
  | 'MONITORING'
  | 'FAILED'
  | string;

export type TripLoopUiPhase =
  | 'validating'
  | 'issues_found'
  | 'awaiting_approval'
  | 'completed'
  | 'failed';

export type InTripLoopUiPhase =
  | 'monitoring'
  | 'change_detected'
  | 'awaiting_approval'
  | 'resolved'
  | 'failed';

export type LoopChecklistResult = 'passed' | 'pending' | 'failed' | 'deferred';

export interface ReadinessSnapshot {
  readinessScore: number;
  hardBlockers: number;
  mustHandleCount: number;
  suggestAdjustCount: number;
  canStartExecute: boolean;
  verdictStatus: FeasibilityVerdictStatus | string;
  completionRateP10?: number;
}

export interface TripLoopChecklistItem {
  id: string;
  label: string;
  result: LoopChecklistResult;
  detail?: string;
}

export interface TripLoopIssueImpact {
  budgetDelta?: string;
  travelDelta?: string;
  preferenceImpact?: string;
}

export interface TripLoopIssueCard {
  issueId: string;
  title?: string;
  problem?: string;
  systemAttempts?: string[];
  recommendation: string;
  impact?: TripLoopIssueImpact;
  requiresApproval?: boolean;
  optionId?: string;
  triggerKind?: string;
  environmentEventId?: string;
  planId?: string;
}

export interface TripLoopPrimaryAction {
  label: string;
  loopRunId: string;
  patchCount?: number;
  planCount?: number;
}

export interface TripLoopUiView {
  phase: TripLoopUiPhase;
  headline: string;
  subheadline?: string;
  progress: {
    completedChecks: number;
    totalChecks: number;
    label: string;
  };
  checklist: TripLoopChecklistItem[];
  issueCards: TripLoopIssueCard[];
  primaryAction?: TripLoopPrimaryAction;
  snapshot?: {
    before: ReadinessSnapshot;
    after: ReadinessSnapshot;
  };
}

export interface InTripLoopUiView {
  phase: InTripLoopUiPhase;
  headline: string;
  subheadline?: string;
  layers: {
    happened: string;
    impact: string;
    action: string;
  };
  issueCards: TripLoopIssueCard[];
  primaryAction?: TripLoopPrimaryAction;
}

export interface LoopIterationProposal {
  optionId: string;
  title: string;
  actionType: string;
}

export interface LoopIterationValidation {
  passed: boolean;
  previewStatus: string;
  wouldDefer: boolean;
  feasibilityScoreBefore: number;
  feasibilityScoreAfter?: number;
  completionRateP10?: number;
}

export interface LoopIteration {
  sequence: number;
  issueId: string;
  blockerId?: string;
  issueTitle?: string;
  proposal?: LoopIterationProposal;
  validation?: LoopIterationValidation;
  decision?: string;
  attemptedOptions?: string[];
}

export interface LoopRecommendedPatch {
  issueId: string;
  blockerId?: string;
  optionId: string;
  title?: string;
  actionType?: string;
  previewStatus?: string;
}

export interface InTripRecommendedPlan {
  environmentEventId: string;
  planId: string;
  title?: string;
}

/**
 * POST /readiness-repair — 扁平 ReadinessRepairLoopResult（非 { loopRun, ui }）
 */
export interface ReadinessRepairRunResult {
  loopRunId: string;
  status: LoopRunStatus;
  runtimeState: LoopRuntimeState;
  before: ReadinessSnapshot;
  after: ReadinessSnapshot;
  iterations?: LoopIteration[];
  recommendedPatches?: LoopRecommendedPatch[];
  requiresApproval: boolean;
  stopReason?: string;
  ui?: TripLoopUiView;
}

/**
 * GET /readiness-repair/latest — loopRun 为 DB 记录（id 即 loopRunId；无顶层 recommendedPatches）
 */
export interface LoopRunDetail {
  id: string;
  loopRunId: string;
  status: LoopRunStatus;
  /** 勿用于 C 端渲染 */
  runtimeState?: LoopRuntimeState;
  loopType?: string;
  iterations?: LoopIteration[];
  finalOutcome?: unknown;
}

export interface ReadinessRepairLatestDto {
  loopRun: LoopRunDetail | null;
  ui: TripLoopUiView | null;
}

/**
 * POST /in-trip-recovery — 扁平结果
 */
export interface InTripRecoveryRunResult {
  loopRunId: string;
  status: LoopRunStatus;
  runtimeState: LoopRuntimeState;
  recommendedPlans?: InTripRecommendedPlan[];
  requiresApproval?: boolean;
  ui?: InTripLoopUiView;
}

export interface InTripRecoveryLatestDto {
  loopRun: LoopRunDetail | null;
  ui: InTripLoopUiView | null;
}

export interface ReadinessRepairRunRequest {
  triggerEventId?: string;
  forceRefreshEvidence?: boolean;
  runMonteCarlo?: boolean;
}

export interface ReadinessRepairTriggerRequest {
  triggerType: string;
  externalEventId?: string;
  force?: boolean;
}

export interface LoopApplyPatch {
  issueId: string;
  optionId: string;
  executeDecision?: boolean;
  persistDecision?: boolean;
  runGuardianNegotiation?: boolean;
  forceDecisionRepair?: boolean;
  reason?: string;
}

export interface LoopApplyRequest {
  patches: LoopApplyPatch[];
}

export interface LoopApplyResponse {
  applied: ApplyRepairResponse[];
  after: ReadinessSnapshot;
  loopRunId?: string;
  status?: LoopRunStatus;
}

export interface InTripApplyPlan {
  environmentEventId: string;
  planId: string;
}

export interface InTripApplyRequest {
  plans: InTripApplyPlan[];
}

export interface InTripApplyResponse {
  applied?: ApplyRepairResponse[];
  status?: LoopRunStatus;
  loopRunId?: string;
}

/** 行前 / 行中各维护独立 loopRunId，勿混用 */
export interface TripLoopState {
  readiness?: {
    loopRunId: string | null;
    ui: TripLoopUiView | null;
    recommendedPatches?: LoopRecommendedPatch[];
  };
  inTrip?: {
    loopRunId: string | null;
    ui: InTripLoopUiView | null;
    recommendedPlans?: InTripRecommendedPlan[];
  };
}

/** @deprecated 使用 ReadinessRepairRunResult / LoopRunDetail */
export type ReadinessRepairLoopRunDto = ReadinessRepairRunResult & {
  ui: TripLoopUiView;
};

/** @deprecated 使用 InTripRecoveryRunResult */
export type InTripRecoveryLoopRunDto = InTripRecoveryRunResult & {
  ui: InTripLoopUiView;
};
