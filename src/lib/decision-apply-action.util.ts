import { toast } from 'sonner';
import { decisionProblemsApi } from '@/api/decision-problems';
import { resolveDecisionActionId } from '@/lib/decision-action.util';
import {
  describeApplyOutcomeFailure,
  isApplyOutcomeBlocked,
  isApplyOutcomeSuccessful,
} from '@/lib/decision-apply-outcome.util';
import {
  inferExecutionStatusAfterApply,
  isRevalidationPending,
  pollDecisionProblemApplyTask,
  pollDecisionProblemApplyUntilSettled,
} from '@/lib/decision-apply-polling.util';
import {
  applyTaskStatusMessage,
  isAsyncApplyUnsupportedError,
} from '@/lib/decision-apply-task.util';
import {
  buildResolutionIdempotencyKey,
  normalizeApplyDecisionProblemResponse,
  normalizeSubmitDecisionResolutionResponse,
} from '@/lib/decision-resolution.util';
import type { DecisionAction } from '@/generated/unified-decision-contracts';
import type {
  ApplyDecisionProblemResponse,
  SubmitDecisionResolutionResponse,
} from '@/generated/unified-decision-contracts';
import type { CausalTraceReference } from '@/types/causal-trace';
import { resolveCausalTraceRefForSubmit } from '@/lib/causal-trace-view.util';

export interface SubmitDecisionResolutionInput {
  tripId: string;
  problemId: string;
  action: DecisionAction;
  reason?: string;
  acknowledgement?: string[];
  causalTraceRef?: CausalTraceReference;
  /** preview 优先于 detail 解析 causalTraceRef */
  previewCausalTraceRef?: CausalTraceReference;
  detailCausalTraceRef?: CausalTraceReference;
}

export interface DecisionApplyActionOptions {
  /** 抑制成功/提示 toast（apply 重试链中的 resolutions 提交） */
  silent?: boolean;
  /** false 时走同步 POST apply（旧客户端） */
  async?: boolean;
  causalTraceRef?: CausalTraceReference;
}

function finalizeApplyResult(
  result: ApplyDecisionProblemResponse,
): ApplyDecisionProblemResponse {
  const inferredStatus = inferExecutionStatusAfterApply(result);
  if (inferredStatus && !result.problem?.executionStatus) {
    return {
      ...result,
      problem: { ...result.problem, executionStatus: inferredStatus },
    };
  }
  if (inferredStatus === 'APPLIED' && result.problem?.executionStatus) {
    return {
      ...result,
      problem: { ...result.problem, executionStatus: 'APPLIED' },
    };
  }
  return result;
}

function showApplySuccessToast(
  result: ApplyDecisionProblemResponse,
  options?: DecisionApplyActionOptions,
): void {
  if (options?.silent) return;

  if (isApplyOutcomeBlocked(result)) {
    toast.error('未能应用到行程', {
      description: describeApplyOutcomeFailure(result),
    });
    return;
  }

  if (!isApplyOutcomeSuccessful(result) && isRevalidationPending(result.revalidation?.status)) {
    toast.message('应用已提交', {
      description: '行程复核仍在进行，请稍后刷新查看',
    });
    return;
  }

  if (!isApplyOutcomeSuccessful(result)) {
    toast.message('应用已提交', {
      description: describeApplyOutcomeFailure(result),
    });
    return;
  }

  if (result.suggestedSubTasks?.length) {
    toast.success('已应用到行程', {
      description: `已自动创建 ${result.suggestedSubTasks.length} 项跟进子任务`,
    });
  } else {
    toast.success('已应用到行程');
  }
}

async function runSyncApplyWithLegacyPoll(
  tripId: string,
  problemId: string,
  body: { acknowledgement?: string[]; causalTraceRef?: CausalTraceReference } | undefined,
  options?: DecisionApplyActionOptions,
): Promise<ApplyDecisionProblemResponse> {
  let result = await decisionProblemsApi.applyProblemDecision(tripId, problemId, body);

  if (isRevalidationPending(result.revalidation?.status)) {
    if (!options?.silent) {
      toast.message('正在重新验证行程', { description: '应用已提交，等待复核完成…' });
    }
    result = await pollDecisionProblemApplyUntilSettled(tripId, problemId, result);
  }

  return finalizeApplyResult(result);
}

async function runAsyncApply(
  tripId: string,
  problemId: string,
  body: { acknowledgement?: string[]; causalTraceRef?: CausalTraceReference } | undefined,
  options?: DecisionApplyActionOptions,
): Promise<ApplyDecisionProblemResponse> {
  let progressToastShown = false;
  const showProgress = (status: string) => {
    if (options?.silent) return;
    const message = applyTaskStatusMessage(status);
    if (!message) return;
    if (!progressToastShown) {
      progressToastShown = true;
      toast.message(message, { description: '应用已在后台执行，请稍候…' });
    }
  };

  const started = await decisionProblemsApi.startApplyProblemDecision(tripId, problemId, body);

  if (started.mode === 'sync') {
    return finalizeApplyResult(started.result);
  }

  showProgress(String(started.accepted.status));

  const result = await pollDecisionProblemApplyTask(tripId, problemId, started.accepted, {
    onStatusChange: showProgress,
  });

  return finalizeApplyResult(result);
}

export async function submitDecisionResolution(
  input: SubmitDecisionResolutionInput,
  options?: DecisionApplyActionOptions,
): Promise<SubmitDecisionResolutionResponse | null> {
  const { tripId, problemId, action, reason, acknowledgement } = input;

  if (!action.allowed) {
    if (action.blockedReason) toast.error(action.blockedReason);
    return null;
  }

  const selectedActionId = resolveDecisionActionId(action);
  if (!selectedActionId) {
    toast.error('请先选择处理方式', {
      description: '需要 detail.actions[].actionId 后再提交结论',
    });
    return null;
  }

  try {
    const causalTraceRef =
      input.causalTraceRef ??
      resolveCausalTraceRefForSubmit({
        preview: input.previewCausalTraceRef
          ? { causalTraceRef: input.previewCausalTraceRef }
          : null,
        detail: input.detailCausalTraceRef
          ? { causalTraceRef: input.detailCausalTraceRef }
          : null,
      });

    const result = await decisionProblemsApi.submitResolution(tripId, problemId, {
      selectedActionId,
      idempotencyKey: buildResolutionIdempotencyKey(tripId, problemId, selectedActionId),
      reason,
      acknowledgement,
      causalTraceRef,
    });
    if (!options?.silent) {
      toast.success('结论已提交', {
        description: result.nextStep === 'APPLY' ? '请确认「应用到行程」' : undefined,
      });
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交结论失败';
    if (isDecisionAcknowledgementRequiredError(err)) {
      if (!options?.silent) {
        toast.error('请先勾选确认项', {
          description: '请使用预览中的确认文案勾选后再提交。',
        });
      }
      throw err;
    }
    if (/DECISION_ACTION_NOT_FOUND:\s*undefined/i.test(message)) {
      toast.error('提交失败：后端未收到方案 ID', {
        description:
          '请确认 POST body 含 selectedActionId，且后端已部署 normalize-submit-resolution-request；detail.actions 非空。',
      });
    } else if (/DECISION_ACTION_REQUIRED/i.test(message)) {
      toast.error('请先选择处理方式', { description: message });
    } else {
      toast.error(message);
    }
    return null;
  }
}

export async function applyDecisionProblemToTrip(
  tripId: string,
  problemId: string,
  options?: { acknowledgement?: string[]; causalTraceRef?: CausalTraceReference } &
    DecisionApplyActionOptions,
): Promise<ApplyDecisionProblemResponse | null> {
  const body =
    options?.acknowledgement?.length || options?.causalTraceRef
      ? {
          ...(options.acknowledgement?.length
            ? { acknowledgement: options.acknowledgement }
            : {}),
          ...(options.causalTraceRef ? { causalTraceRef: options.causalTraceRef } : {}),
        }
      : undefined;
  const useAsync = options?.async !== false;

  try {
    let result: ApplyDecisionProblemResponse;

    if (useAsync) {
      try {
        result = await runAsyncApply(tripId, problemId, body, options);
      } catch (asyncErr) {
        if (!isAsyncApplyUnsupportedError(asyncErr)) throw asyncErr;
        result = await runSyncApplyWithLegacyPoll(tripId, problemId, body, options);
      }
    } else {
      result = await runSyncApplyWithLegacyPoll(tripId, problemId, body, options);
    }

    showApplySuccessToast(result, options);
    return result;
  } catch (err) {
    if (isDecisionAcknowledgementRequiredError(err)) {
      if (options?.acknowledgement?.length) {
        throw err;
      }
      if (!options?.silent) {
        toast.error('请先勾选确认项', {
          description: '该方案需确认影响后再应用到行程。',
        });
      }
    } else if (!options?.silent) {
      toast.error(err instanceof Error ? err.message : '应用到行程失败');
    }
    return null;
  }
}

/** 可行性修复等单步确认场景：submit → apply 链式调用 */
export async function submitAndApplyDecisionResolution(
  input: SubmitDecisionResolutionInput,
): Promise<ApplyDecisionProblemResponse | null> {
  const submitResult = await submitDecisionResolution(input);
  if (!submitResult?.resolution?.resolutionId) return null;
  return applyDecisionProblemToTrip(input.tripId, input.problemId);
}

/** @deprecated 使用 submitDecisionResolution + applyDecisionProblemToTrip */
export async function applyDecisionAction(): Promise<boolean> {
  return false;
}

export { normalizeSubmitDecisionResolutionResponse, normalizeApplyDecisionProblemResponse };
