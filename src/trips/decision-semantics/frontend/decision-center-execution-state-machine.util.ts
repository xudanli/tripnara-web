/**
 * Decision Center 执行态状态机 — V1.6.2
 * 对齐 DECISION_SEMANTICS_FRONTEND_API.md §4.1：禁止把全部 HTTP 200 当成功。
 */
import type {
  CreateDecisionResponse,
  DecisionExecutionStatus,
  DecisionExecutionStatusResponse,
} from '@/types/decision-problem';

export type DecisionExecutionUiVariant =
  | 'success'
  | 'in_progress'
  | 'neutral_replay'
  | 'warning_needs_repair'
  | 'error_rolled_back'
  | 'blocked_stale_evidence'
  | 'error_failed';

export interface DecisionPostApplyCoherenceV1 {
  coherent?: boolean;
  failureMessage?: string;
  needsRepair?: boolean;
}

export interface DecisionEvidenceFreshnessVerdict {
  blocked?: boolean;
  staleEvidenceTypes?: string[];
  message?: string;
}

export interface DecisionExecutionClassification {
  variant: DecisionExecutionUiVariant;
  shouldRefreshItinerary: boolean;
  shouldShowSuccessToast: boolean;
  isTerminal: boolean;
  shouldPoll: boolean;
  needsRepair: boolean;
  effectiveDecisionId?: string;
}

export const DECISION_EXECUTION_TERMINAL_STATUSES: readonly DecisionExecutionStatus[] = [
  'APPLIED',
  'RESOLVED',
  'PARTIALLY_APPLIED',
  'PARTIALLY_RESOLVED',
  'FAILED',
  'IDEMPOTENT_REPLAY',
  'ROLLED_BACK',
  'DATA_STALE',
  'RECORDED',
] as const;

const TERMINAL_SET = new Set<string>(
  DECISION_EXECUTION_TERMINAL_STATUSES.map((s) => s.toUpperCase()),
);

export function normalizeExecutionStatus(
  status: string | null | undefined,
): string {
  return String(status ?? '').trim().toUpperCase();
}

/** BFF 兼容：executionStatus 可能是字符串或对象 */
export function coerceExecutionStatusResponse(
  raw: DecisionExecutionStatusResponse | string | null | undefined,
): DecisionExecutionStatusResponse | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const status = raw.trim();
    return status ? { status } : null;
  }
  if (typeof raw === 'object' && raw.status) return raw;
  return null;
}

export function isTerminalExecutionStatusValue(
  status: string | null | undefined,
): boolean {
  return TERMINAL_SET.has(normalizeExecutionStatus(status));
}

export function shouldPollDecisionExecution(
  status: string | null | undefined,
): boolean {
  return normalizeExecutionStatus(status) === 'APPLYING';
}

export function buildDecisionIdempotencyKey(input: {
  tripId: string;
  problemId: string;
  selectedOptionId: string;
  clientAttemptId: string;
}): string {
  return [
    'dec',
    input.tripId,
    input.problemId,
    input.selectedOptionId,
    input.clientAttemptId,
  ].join('_');
}

function resolveNeedsRepair(
  execution?: DecisionExecutionStatusResponse | null,
): boolean {
  if (!execution) return false;
  return (
    execution.needsRepair === true ||
    execution.postApplyCoherence?.needsRepair === true ||
    execution.postApplyCoherence?.coherent === false
  );
}

function isStaleEvidenceBlocked(
  execution?: DecisionExecutionStatusResponse | null,
): boolean {
  if (!execution) return false;
  return (
    normalizeExecutionStatus(execution.status) === 'DATA_STALE' ||
    execution.evidenceFreshnessBlock?.blocked === true
  );
}

function classifyFromExecution(
  execution: DecisionExecutionStatusResponse | string | null | undefined,
  context: {
    idempotentReplay?: boolean;
    effectiveDecisionId?: string;
    execute?: boolean;
  } = {},
): DecisionExecutionClassification {
  const coerced = coerceExecutionStatusResponse(execution);
  const status = normalizeExecutionStatus(coerced?.status);
  const needsRepair = resolveNeedsRepair(coerced);
  const effectiveDecisionId = context.effectiveDecisionId;

  if (context.idempotentReplay || status === 'IDEMPOTENT_REPLAY') {
    return {
      variant: 'neutral_replay',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: true,
      shouldPoll: false,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  if (status === 'APPLYING') {
    return {
      variant: 'in_progress',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: false,
      shouldPoll: true,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  if (isStaleEvidenceBlocked(coerced)) {
    return {
      variant: 'blocked_stale_evidence',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: true,
      shouldPoll: false,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  if (status === 'ROLLED_BACK') {
    return {
      variant: 'error_rolled_back',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: true,
      shouldPoll: false,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  if (status === 'FAILED') {
    return {
      variant: 'error_failed',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: true,
      shouldPoll: false,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  if (
    status === 'PARTIALLY_APPLIED' ||
    status === 'PARTIALLY_RESOLVED' ||
    needsRepair
  ) {
    return {
      variant: 'warning_needs_repair',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: true,
      shouldPoll: false,
      needsRepair: true,
      effectiveDecisionId,
    };
  }

  if (status === 'APPLIED' || status === 'RESOLVED') {
    return {
      variant: 'success',
      shouldRefreshItinerary: true,
      shouldShowSuccessToast: true,
      isTerminal: true,
      shouldPoll: false,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  if (status === 'RECORDED') {
    const approvedOnly = context.execute === false;
    return {
      variant: approvedOnly ? 'success' : 'in_progress',
      shouldRefreshItinerary: approvedOnly,
      shouldShowSuccessToast: approvedOnly,
      isTerminal: approvedOnly,
      shouldPoll: !approvedOnly,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  return {
    variant: 'error_failed',
    shouldRefreshItinerary: false,
    shouldShowSuccessToast: false,
    isTerminal: true,
    shouldPoll: false,
    needsRepair: false,
    effectiveDecisionId,
  };
}

export function classifyExecutionStatusPoll(
  execution: DecisionExecutionStatusResponse | null | undefined,
  context: { effectiveDecisionId?: string; execute?: boolean } = {},
): DecisionExecutionClassification {
  return classifyFromExecution(execution, context);
}

export function classifyCreateDecisionOutcome(
  response: CreateDecisionResponse,
  context: { execute?: boolean } = {},
): DecisionExecutionClassification {
  const effectiveDecisionId =
    response.effectiveDecisionId ?? response.decision.id;
  const execute =
    context.execute ??
    (response.applyResult?.status !== 'deferred' &&
      response.decision.status !== 'PROPOSED');

  // 联调契约：idempotentReplay 或 executionStatus === 'IDEMPOTENT_REPLAY' → neutral_replay，勿 refresh
  const replayStatus =
    typeof response.executionStatus === 'string'
      ? response.executionStatus
      : coerceExecutionStatusResponse(response.executionStatus)?.status;
  if (
    response.idempotentReplay === true ||
    normalizeExecutionStatus(replayStatus) === 'IDEMPOTENT_REPLAY'
  ) {
    return classifyFromExecution(
      response.executionStatus ?? 'IDEMPOTENT_REPLAY',
      { idempotentReplay: true, effectiveDecisionId, execute },
    );
  }

  if (response.executionStatus) {
    return classifyFromExecution(response.executionStatus, {
      idempotentReplay: response.idempotentReplay,
      effectiveDecisionId,
      execute,
    });
  }

  if (response.applyResult?.status === 'deferred') {
    return {
      variant: 'in_progress',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: false,
      shouldPoll: false,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  const recordStatus = normalizeExecutionStatus(response.decision.status);
  if (recordStatus === 'EXECUTED' || recordStatus === 'APPROVED') {
    return classifyFromExecution(
      { status: recordStatus === 'APPROVED' ? 'RECORDED' : 'APPLIED' },
      { effectiveDecisionId, execute },
    );
  }

  if (recordStatus === 'PROPOSED') {
    return {
      variant: 'in_progress',
      shouldRefreshItinerary: false,
      shouldShowSuccessToast: false,
      isTerminal: false,
      shouldPoll: false,
      needsRepair: false,
      effectiveDecisionId,
    };
  }

  return {
    variant: 'error_failed',
    shouldRefreshItinerary: false,
    shouldShowSuccessToast: false,
    isTerminal: true,
    shouldPoll: false,
    needsRepair: false,
    effectiveDecisionId,
  };
}

export function isDecisionPendingAttention(
  status: string | null | undefined,
  needsRepair?: boolean,
): boolean {
  if (needsRepair) return true;
  const normalized = normalizeExecutionStatus(status);
  return (
    normalized === 'PARTIALLY_APPLIED' ||
    normalized === 'PARTIALLY_RESOLVED' ||
    normalized === 'APPLYING' ||
    normalized === 'DATA_STALE' ||
    normalized === 'FAILED' ||
    normalized === 'ROLLED_BACK'
  );
}

export const DECISION_EXECUTION_UI_VARIANT_META: Record<
  DecisionExecutionUiVariant,
  { tone: 'success' | 'info' | 'warning' | 'error' | 'loading'; title: string; cta?: string }
> = {
  success: { tone: 'success', title: '决策已应用', cta: '查看行程变更' },
  in_progress: { tone: 'loading', title: '正在应用…' },
  neutral_replay: { tone: 'info', title: '该方案已处理过', cta: '查看原决策' },
  warning_needs_repair: { tone: 'warning', title: '部分应用，需继续修复', cta: '继续修复' },
  error_rolled_back: { tone: 'error', title: '变更已回滚', cta: '重新选方案' },
  blocked_stale_evidence: { tone: 'warning', title: '证据已过期', cta: '刷新路况/天气' },
  error_failed: { tone: 'error', title: '应用失败', cta: '重试' },
};
