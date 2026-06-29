import { tripsApi } from '@/api/trips';
import type {
  DecisionCheckerDeferredDto,
  PlanningConflictsResponse,
} from '@/types/planning-conflicts';

/** deferred 轮询默认间隔（ms），可被 BFF `pollIntervalMs` 覆盖 */
export const PLANNING_CONFLICTS_DC_POLL_MS_DEFAULT = 5000;
/** @deprecated 使用 PLANNING_CONFLICTS_DC_POLL_MS_DEFAULT */
export const PLANNING_CONFLICTS_DC_POLL_MS = PLANNING_CONFLICTS_DC_POLL_MS_DEFAULT;
export const PLANNING_CONFLICTS_DC_POLL_MAX_ATTEMPTS = 150;

const inflightPolls = new Map<string, Promise<PlanningConflictsResponse>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveDecisionCheckerPollIntervalMs(
  deferred?: DecisionCheckerDeferredDto | null,
): number {
  const ms = deferred?.pollIntervalMs;
  if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
    return Math.round(ms);
  }
  return PLANNING_CONFLICTS_DC_POLL_MS_DEFAULT;
}

export function resolveDecisionCheckerDeferredStatus(
  res: PlanningConflictsResponse,
): DecisionCheckerDeferredDto['status'] | 'ready_inline' {
  if (res.decisionChecker) return 'ready_inline';
  return res.decisionCheckerDeferred?.status ?? 'ready_inline';
}

/** 轮询 planning-conflicts deferred decisionChecker（同 taskId 共享 in-flight） */
export async function pollUntilPlanningConflictsDecisionChecker(
  tripId: string,
  deferred: DecisionCheckerDeferredDto,
  options?: { intervalMs?: number; maxAttempts?: number },
): Promise<PlanningConflictsResponse> {
  if (deferred.status === 'failed') {
    throw new Error(deferred.error ?? '决策检查器计算失败');
  }

  if (deferred.status === 'ready') {
    const res = await tripsApi.getPlanningConflicts(tripId, {
      decisionCheckerTaskId: deferred.taskId,
    });
    if (!res.decisionChecker) {
      throw new Error(res.decisionCheckerDeferred?.error ?? '决策检查器未返回');
    }
    return res;
  }

  const existing = inflightPolls.get(deferred.taskId);
  if (existing) return existing;

  const intervalMs = options?.intervalMs ?? resolveDecisionCheckerPollIntervalMs(deferred);
  const maxAttempts = options?.maxAttempts ?? PLANNING_CONFLICTS_DC_POLL_MAX_ATTEMPTS;

  const task = (async (): Promise<PlanningConflictsResponse> => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await sleep(intervalMs);
      }

      const res = await tripsApi.getPlanningConflicts(tripId, {
        decisionCheckerTaskId: deferred.taskId,
      });

      if (res.decisionChecker) {
        return res;
      }

      const status = res.decisionCheckerDeferred?.status;
      if (status === 'failed') {
        throw new Error(res.decisionCheckerDeferred?.error ?? '决策检查器计算失败');
      }
      if (status === 'ready' && !res.decisionChecker) {
        throw new Error('决策检查器状态为 ready 但未返回数据');
      }
    }

    throw new Error('决策检查器计算超时，请稍后刷新');
  })().finally(() => {
    inflightPolls.delete(deferred.taskId);
  });

  inflightPolls.set(deferred.taskId, task);
  return task;
}

export function clearPlanningConflictsDeferredPoll(taskId: string): void {
  inflightPolls.delete(taskId);
}
