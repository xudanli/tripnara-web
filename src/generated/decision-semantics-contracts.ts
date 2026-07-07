/**
 * Decision Semantics 类型包（与 BFF 契约对齐）。
 * 生成/校验：`npm run contracts:decision-semantics`
 */
export type {
  AffectedScopeDisplay,
  AffectedScopeType,
  CreateDecisionRequest,
  CreateDecisionResponse,
  DecisionCenterOverview,
  DecisionCenterRecentDecisionSnapshot,
  DecisionEvidenceFreshnessVerdict,
  DecisionExecutionStatus,
  DecisionExecutionStatusResponse,
  DecisionOption,
  DecisionPostApplyCoherenceV1,
  DecisionProblemDetail,
  DecisionProblemResolutionSnapshot,
  DecisionProblemSummary,
  DecisionRecord,
  ExecutionCapability,
  PrimaryEnforcement,
  ProblemResolutionKind,
  RepairCommand,
} from '@/types/decision-problem';

export type {
  DecisionExecutionClassification,
  DecisionExecutionUiVariant,
} from '@/trips/decision-semantics/frontend/decision-center-execution-state-machine.util';

export {
  CONSTRAINT_ENFORCEMENT_LABELS,
  EXECUTION_CAPABILITY_LABELS,
  executionCapabilityConfirmLabel,
  executionCapabilityLabel,
} from '@/lib/decision-problem-display.util';

export {
  DECISION_EXECUTION_TERMINAL_STATUSES,
  DECISION_EXECUTION_UI_VARIANT_META,
  buildDecisionIdempotencyKey,
  classifyCreateDecisionOutcome,
  classifyExecutionStatusPoll,
  isDecisionPendingAttention,
  isTerminalExecutionStatusValue,
  normalizeExecutionStatus,
  shouldPollDecisionExecution,
} from '@/trips/decision-semantics/frontend/decision-center-execution-state-machine.util';

export {
  emitDecisionExecutionToasts,
  runDecisionConfirmWithExecutionGate,
} from '@/trips/decision-semantics/frontend/decision-confirm-execution-gate.util';

/** @deprecated 使用 isTerminalExecutionStatusValue from contracts */
export { isTerminalExecutionStatusValue as isTerminalExecutionStatus } from '@/trips/decision-semantics/frontend/decision-center-execution-state-machine.util';
