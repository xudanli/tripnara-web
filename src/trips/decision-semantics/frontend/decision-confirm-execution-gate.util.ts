/**
 * L4 决策确认 SSOT：POST + 分类 + toast + 行程刷新 gate
 * 供 FeasibilityRepairWorkflow 等决策确认流程共用。
 */
import { toast } from 'sonner';
import {
  buildDecisionIdempotencyKey,
  type DecisionExecutionClassification,
} from './decision-center-execution-state-machine.util';
import { executeDecisionWithPolling } from '@/lib/decision-problem-repair-bridge.util';
import { notifyDecisionValidationRefresh } from '@/lib/plan-studio-loop-events';
import type {
  CreateDecisionResponse,
  DecisionExecutionStatusResponse,
  ExecutionCapability,
} from '@/types/decision-problem';

export interface DecisionConfirmExecutionGateInput {
  tripId: string;
  problemId: string;
  selectedOptionId: string;
  clientAttemptId: string;
  executionCapability?: ExecutionCapability;
  reason?: string;
  acknowledgement?: string[];
  execute?: boolean;
  idempotencyKey?: string;
}

export interface DecisionConfirmExecutionGateCallbacks {
  /** 仅 shouldRefreshItinerary === true 时调用 */
  onRefreshItinerary?: (result: CreateDecisionResponse) => void | Promise<void>;
  /** 默认 true */
  emitToasts?: boolean;
}

export interface DecisionConfirmExecutionGateResult {
  response: CreateDecisionResponse;
  executionStatus: DecisionExecutionStatusResponse | null;
  classification: DecisionExecutionClassification;
  isApprovedOnly: boolean;
  toastDescription?: string;
}

export function emitDecisionExecutionToasts(input: {
  classification: DecisionExecutionClassification;
  response: CreateDecisionResponse;
  executionStatus: DecisionExecutionStatusResponse | null;
  isApprovedOnly: boolean;
  toastDescription?: string;
}): void {
  const { classification, response, executionStatus, isApprovedOnly, toastDescription } = input;

  if (classification.variant === 'neutral_replay') {
    toast.message('该方案已处理过', { description: '已返回先前决策结果' });
    return;
  }
  if (classification.variant === 'warning_needs_repair') {
    toast.warning('部分应用，需继续修复', {
      description:
        executionStatus?.postApplyCoherence?.failureMessage ??
        executionStatus?.explanation ??
        '部分变更已写入，请继续修复',
    });
    return;
  }
  if (classification.variant === 'blocked_stale_evidence') {
    toast.warning('证据已过期', {
      description:
        executionStatus?.evidenceFreshnessBlock?.message ??
        '请刷新路况/天气后重新预览',
    });
    return;
  }
  if (classification.variant === 'error_rolled_back') {
    toast.error('变更已回滚', {
      description: executionStatus?.explanation ?? '请重新选择方案',
    });
    return;
  }
  if (classification.variant === 'error_failed') {
    toast.error('应用失败', {
      description: executionStatus?.explanation ?? response.applyResult?.message,
    });
    return;
  }
  if (classification.shouldShowSuccessToast) {
    toast.success(isApprovedOnly ? '决策已批准' : '决策已执行', {
      description: toastDescription,
    });
  }
}

export async function runDecisionConfirmWithExecutionGate(
  input: DecisionConfirmExecutionGateInput,
  callbacks: DecisionConfirmExecutionGateCallbacks = {},
): Promise<DecisionConfirmExecutionGateResult> {
  const emitToasts = callbacks.emitToasts !== false;

  const idempotencyKey =
    input.idempotencyKey ??
    buildDecisionIdempotencyKey({
      tripId: input.tripId,
      problemId: input.problemId,
      selectedOptionId: input.selectedOptionId,
      clientAttemptId: input.clientAttemptId,
    });

  const polled = await executeDecisionWithPolling({
    tripId: input.tripId,
    executionCapability: input.executionCapability,
    clientAttemptId: input.clientAttemptId,
    body: {
      problemId: input.problemId,
      selectedOptionId: input.selectedOptionId,
      reason: input.reason,
      acknowledgement: input.acknowledgement,
      execute: input.execute,
      idempotencyKey,
    },
  });

  if (emitToasts) {
    emitDecisionExecutionToasts({
      classification: polled.classification,
      response: polled.response,
      executionStatus: polled.executionStatus,
      isApprovedOnly: polled.isApprovedOnly,
      toastDescription: polled.toastDescription,
    });

    if (polled.response.applyResult?.status === 'deferred') {
      if (polled.classification.variant !== 'blocked_stale_evidence') {
        toast.message('需进一步确认', {
          description: polled.response.applyResult.message ?? '变更尚未写入行程',
        });
      }
    } else if (
      polled.response.decision.status === 'PROPOSED' &&
      !polled.classification.isTerminal
    ) {
      toast.message('已记录决策', { description: '尚未修改行程' });
    }
  }

  if (polled.classification.shouldRefreshItinerary) {
    notifyDecisionValidationRefresh(input.tripId, {
      decisionId: polled.response.decision.id,
    });
    await callbacks.onRefreshItinerary?.(polled.response);
  }

  return {
    response: polled.response,
    executionStatus: polled.executionStatus,
    classification: polled.classification,
    isApprovedOnly: polled.isApprovedOnly,
    toastDescription: polled.toastDescription,
  };
}
