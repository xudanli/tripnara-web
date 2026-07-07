import { decisionProblemsApi, DecisionSemanticsApiError } from '@/api/decision-problems';
import type { ApplyDecisionProblemResponse } from '@/generated/unified-decision-contracts';
import type { DecisionProblemApplyAcceptedView } from '@/types/unified-decision';
import {
  DEFAULT_APPLY_TASK_POLL_INTERVAL_MS,
  MAX_APPLY_TASK_POLL_ATTEMPTS,
  resolveApplyTaskPollPath,
} from '@/lib/decision-apply-task.util';

export const APPLY_REVALIDATION_POLL_INTERVAL_MS = 2000;
export const MAX_APPLY_REVALIDATION_POLL_ATTEMPTS = 20;

export {
  DEFAULT_APPLY_TASK_POLL_INTERVAL_MS,
  MAX_APPLY_TASK_POLL_ATTEMPTS,
} from '@/lib/decision-apply-task.util';

export function isRevalidationPending(status: string | undefined | null): boolean {
  return String(status ?? '').trim().toUpperCase() === 'PENDING';
}

export function isDecisionExecutionApplied(status: string | undefined | null): boolean {
  const normalized = String(status ?? '').trim().toUpperCase();
  return normalized === 'APPLIED' || normalized === 'EXECUTED';
}

/** apply 响应可能缺 problem.executionStatus；从 applyResult / revalidation 推断终态 */
export function inferExecutionStatusAfterApply(
  response: ApplyDecisionProblemResponse,
): string | undefined {
  const fromProblem = response.problem?.executionStatus;
  if (isDecisionExecutionApplied(fromProblem)) return 'APPLIED';

  const applyStatus = String(response.applyResult?.status ?? '').trim().toUpperCase();
  if (applyStatus === 'APPLIED' || applyStatus === 'SUCCESS' || applyStatus === 'COMPLETED') {
    return 'APPLIED';
  }

  if (!isRevalidationPending(response.revalidation?.status)) {
    const hasPlan =
      Boolean(response.applyResult?.actionPlanId?.trim()) ||
      Boolean(response.collaborativeTask?.actionPlanId?.trim());
    if (hasPlan) return 'APPLIED';
  }

  return fromProblem ? String(fromProblem) : undefined;
}

export function isApplyRevalidationSettled(response: ApplyDecisionProblemResponse): boolean {
  if (isDecisionExecutionApplied(response.problem?.executionStatus)) return true;
  if (!isRevalidationPending(response.revalidation?.status)) return true;
  return false;
}

/**
 * revalidation.status=PENDING 时轮询 apply（幂等）直至 settled；
 * apply 失败时降级 GET detail 检查 executionStatus。
 */
export async function pollDecisionProblemApplyUntilSettled(
  tripId: string,
  problemId: string,
  initial: ApplyDecisionProblemResponse,
): Promise<ApplyDecisionProblemResponse> {
  let latest = initial;
  if (isApplyRevalidationSettled(latest)) return latest;

  for (let attempt = 0; attempt < MAX_APPLY_REVALIDATION_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, APPLY_REVALIDATION_POLL_INTERVAL_MS));

    try {
      latest = await decisionProblemsApi.applyProblemDecision(tripId, problemId);
      if (isApplyRevalidationSettled(latest)) return latest;
      continue;
    } catch {
      // apply poll 暂不可用，降级读 detail
    }

    try {
      const detail = await decisionProblemsApi.getProblem(tripId, problemId);
      if (isDecisionExecutionApplied(detail.executionStatus)) {
        return {
          ...latest,
          problem: {
            workflowStatus: detail.workflowStatus,
            executionStatus: detail.executionStatus,
          },
          revalidation: { status: 'PASSED' },
        };
      }
    } catch {
      break;
    }
  }

  return latest;
}

export interface PollDecisionProblemApplyTaskOptions {
  onStatusChange?: (status: string) => void;
  maxAttempts?: number;
}

/** POST apply?async=1 后轮询 apply-tasks/:taskId */
export async function pollDecisionProblemApplyTask(
  tripId: string,
  problemId: string,
  accepted: DecisionProblemApplyAcceptedView,
  options?: PollDecisionProblemApplyTaskOptions,
): Promise<ApplyDecisionProblemResponse> {
  const maxAttempts = options?.maxAttempts ?? MAX_APPLY_TASK_POLL_ATTEMPTS;
  const pollPath = resolveApplyTaskPollPath(accepted, tripId, problemId);
  let intervalMs = accepted.pollIntervalMs ?? DEFAULT_APPLY_TASK_POLL_INTERVAL_MS;
  let lastStatus = accepted.status;

  options?.onStatusChange?.(String(lastStatus));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const task = await decisionProblemsApi.getApplyProblemTask(pollPath);
    intervalMs = task.pollIntervalMs ?? intervalMs;

    if (task.status !== lastStatus) {
      lastStatus = task.status;
      options?.onStatusChange?.(String(task.status));
    }

    if (String(task.status).toUpperCase() === 'READY') {
      if (!task.result) {
        throw new DecisionSemanticsApiError('apply 任务已完成但缺少 result');
      }
      return task.result;
    }

    if (String(task.status).toUpperCase() === 'FAILED') {
      const message = task.error?.message ?? '应用到行程失败';
      throw new DecisionSemanticsApiError(message, task.error?.code as never, task.error?.details);
    }
  }

  throw new DecisionSemanticsApiError('apply 任务超时，请稍后刷新查看行程状态');
}
