import type { TripDomain } from '@/types/trip-domain-influence';

export interface DecisionProblemNegotiationClosedOutcome {
  recommendedOptionId?: string;
  summaryCN?: string;
  utteranceCount?: number;
  closedAt?: string;
}

export type DecisionProblemNegotiationStatus =
  | 'none'
  | 'pending'
  | 'in_discussion'
  | 'closed'
  | (string & {});

export type DecisionProblemNegotiationButtonLabel = '发起协商' | '进入协商' | null;

/** GET decision-problems/:id 协商投影（Legacy data 内 / Unified 顶层并列） */
export interface DecisionProblemNegotiationProjection {
  taskId?: string;
  roundId?: string | null;
  status?: DecisionProblemNegotiationStatus;
  buttonLabel?: DecisionProblemNegotiationButtonLabel;
  closedOutcome?: DecisionProblemNegotiationClosedOutcome;
  /** BFF SSOT — false 时隐藏「发起协商」（预约/执行型） */
  visible?: boolean;
}

export interface DecisionProblemNegotiationDetailFields {
  suggestedNegotiationDomain?: string;
  suggestedDecisionNode?: string;
  negotiation?: DecisionProblemNegotiationProjection;
}

export type DecisionProblemNegotiationAction = 'created' | 'enter_existing' | 'claim_required';

export type NegotiationPreflightBlockReason =
  | 'SOLO_TRIP_NOT_SUPPORTED'
  | 'INSUFFICIENT_MEMBERS'
  | 'PROBLEM_NOT_NEGOTIABLE'
  | 'PROBLEM_NOT_ELIGIBLE'
  | 'NEGOTIATION_ALREADY_ACTIVE'
  | 'DOMAIN_ROUND_CONFLICT'
  | 'CLAIM_REQUIRED'
  | (string & {});

export interface DecisionProblemNegotiationPrefillOption {
  id: string;
  label: string;
}

export interface DecisionProblemNegotiationPrefill {
  title?: string;
  question?: string;
  options?: DecisionProblemNegotiationPrefillOption[];
}

export interface DecisionProblemNegotiationClientNavigation {
  roundId: string | null;
  roundDomain: string | null;
}

export interface DecisionProblemNegotiationClaimRequired {
  domain: TripDomain | string;
  domainLabel?: string;
}

export interface StartDecisionProblemNegotiationRequest {
  focusConflictId?: string;
  selectedOptionId?: string;
  note?: string;
  closesAt?: string;
  autoClaimDomain?: boolean;
  /** submit resolution 后绑定协作子任务 */
  resolutionId?: string;
  actionPlanId?: string;
}

export interface StartDecisionProblemNegotiationResponse {
  action: DecisionProblemNegotiationAction;
  negotiationTaskId?: string;
  roundId?: string | null;
  roundDomain?: string | null;
  status?: string;
  clientNavigation: DecisionProblemNegotiationClientNavigation;
  prefill?: DecisionProblemNegotiationPrefill;
  claimRequired?: DecisionProblemNegotiationClaimRequired;
}

export interface DecisionProblemNegotiationPreflightResponse {
  canStart: boolean;
  blockReason?: NegotiationPreflightBlockReason;
  blockMessageCN?: string;
  suggestedDomain?: TripDomain | string;
  suggestedDecisionNode?: string;
  requiresDomainClaim?: boolean;
  existingRoundId?: string | null;
  existingTaskStatus?: string | null;
  crossLevel?: string;
}

export interface DomainRoundConflictDetails {
  existingRoundId?: string;
  existingProblemId?: string;
  roundDomain?: string;
}
