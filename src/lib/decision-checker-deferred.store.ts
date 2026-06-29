import type { DecisionCheckerDeferredDto } from '@/types/planning-conflicts';
import type { DecisionCheckerResponse } from '@/types/decision-checker';
import { DEFERRED_TASK_STALE_MS } from '@/lib/planning-conflicts-fallback.util';
import {
  clearPlanningConflictsDeferredPoll,
  pollUntilPlanningConflictsDecisionChecker,
  resolveDecisionCheckerPollIntervalMs,
} from '@/lib/planning-conflicts-deferred.util';

export interface DecisionCheckerDeferredRecord {
  taskId: string;
  pollIntervalMs: number;
  status: DecisionCheckerDeferredDto['status'];
  decisionChecker: DecisionCheckerResponse | null;
  loading: boolean;
  error: string | null;
  pendingSinceMs: number | null;
}

type Listener = () => void;

interface TripDeferredState {
  deferred: DecisionCheckerDeferredDto;
  pollIntervalMs: number;
  decisionChecker: DecisionCheckerResponse | null;
  loading: boolean;
  error: string | null;
  pollPromise: Promise<DecisionCheckerResponse | null> | null;
  registeredAtMs: number;
}

const tripStates = new Map<string, TripDeferredState>();
const listenersByTrip = new Map<string, Set<Listener>>();

const EMPTY_RECORD: DecisionCheckerDeferredRecord = {
  taskId: '',
  pollIntervalMs: resolveDecisionCheckerPollIntervalMs(null),
  status: 'pending',
  decisionChecker: null,
  loading: false,
  error: null,
  pendingSinceMs: null,
};

function notify(tripId: string): void {
  for (const listener of listenersByTrip.get(tripId) ?? []) {
    listener();
  }
}

function toRecord(tripId: string): DecisionCheckerDeferredRecord {
  const state = tripStates.get(tripId);
  if (!state) return EMPTY_RECORD;
  const pending =
    !state.decisionChecker && state.deferred.status === 'pending' && Boolean(state.deferred.taskId);
  return {
    taskId: state.deferred.taskId,
    pollIntervalMs: state.pollIntervalMs,
    status: state.decisionChecker ? 'ready' : state.deferred.status,
    decisionChecker: state.decisionChecker,
    loading: state.loading,
    error: state.error,
    pendingSinceMs: pending ? state.registeredAtMs : null,
  };
}

export function isDecisionCheckerDeferredStale(
  tripId: string,
  nowMs = Date.now(),
): boolean {
  const state = tripStates.get(tripId);
  if (!state || state.decisionChecker) return false;
  if (state.deferred.status !== 'pending' || !state.deferred.taskId) return false;
  return nowMs - state.registeredAtMs >= DEFERRED_TASK_STALE_MS;
}

/** pending 超过 90s：丢弃本地 task，下次 fetch 将重新 includeDecisionChecker=1 */
export function discardStaleDecisionCheckerDeferred(tripId: string): boolean {
  if (!isDecisionCheckerDeferredStale(tripId)) return false;
  clearDecisionCheckerDeferredStore(tripId);
  return true;
}

/** 首包 deferred 注册：同 trip 同 taskId 复用；新 taskId 替换旧 pending */
export function registerDecisionCheckerDeferred(
  tripId: string,
  deferred: DecisionCheckerDeferredDto,
): DecisionCheckerDeferredRecord {
  const existing = tripStates.get(tripId);

  if (existing?.deferred.taskId === deferred.taskId) {
    if (deferred.status === 'failed') {
      existing.deferred = deferred;
      existing.error = deferred.error ?? '决策检查器计算失败';
      existing.loading = false;
      notify(tripId);
    }
    return toRecord(tripId);
  }

  if (existing?.deferred.taskId) {
    clearPlanningConflictsDeferredPoll(existing.deferred.taskId);
  }

  const pollIntervalMs = resolveDecisionCheckerPollIntervalMs(deferred);
  tripStates.set(tripId, {
    deferred,
    pollIntervalMs,
    decisionChecker: null,
    loading: deferred.status === 'pending',
    error: deferred.status === 'failed' ? deferred.error ?? '决策检查器计算失败' : null,
    pollPromise: null,
    registeredAtMs: Date.now(),
  });
  notify(tripId);
  return toRecord(tripId);
}

export function setDecisionCheckerDeferredReady(
  tripId: string,
  decisionChecker: DecisionCheckerResponse,
): void {
  const existing = tripStates.get(tripId);
  if (existing) {
    if (existing.deferred.taskId) {
      clearPlanningConflictsDeferredPoll(existing.deferred.taskId);
    }
    existing.pollPromise = null;
    existing.decisionChecker = decisionChecker;
    existing.loading = false;
    existing.error = null;
    existing.deferred = { ...existing.deferred, status: 'ready' };
    notify(tripId);
    return;
  }

  tripStates.set(tripId, {
    deferred: {
      status: 'ready',
      taskId: `inline-${tripId}`,
    },
    pollIntervalMs: resolveDecisionCheckerPollIntervalMs(null),
    decisionChecker,
    loading: false,
    error: null,
    pollPromise: null,
    registeredAtMs: Date.now(),
  });
  notify(tripId);
}

/** refetch / invalidate 时清除，允许重新 includeDecisionChecker=1 */
export function clearDecisionCheckerDeferredStore(tripId: string): void {
  const state = tripStates.get(tripId);
  if (state?.deferred.taskId) {
    clearPlanningConflictsDeferredPoll(state.deferred.taskId);
  }
  tripStates.delete(tripId);
}

/** React Query fetch：已有 pending task 时只带 decisionCheckerTaskId（过期则 null） */
export function getActiveDecisionCheckerTaskId(tripId: string): string | null {
  if (isDecisionCheckerDeferredStale(tripId)) return null;
  const state = tripStates.get(tripId);
  if (!state?.deferred.taskId) return null;
  if (state.decisionChecker) return state.deferred.taskId;
  if (state.deferred.status === 'failed') return null;
  return state.deferred.taskId;
}

export function getDecisionCheckerDeferredSnapshot(
  tripId: string,
): DecisionCheckerDeferredRecord {
  return toRecord(tripId);
}

export function subscribeDecisionCheckerDeferred(
  tripId: string,
  listener: Listener,
): () => void {
  let set = listenersByTrip.get(tripId);
  if (!set) {
    set = new Set();
    listenersByTrip.set(tripId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) listenersByTrip.delete(tripId);
  };
}

/** 全局唯一 poll 循环（同 trip/taskId 共享） */
export function ensureDecisionCheckerDeferredPolling(tripId: string): void {
  const state = tripStates.get(tripId);
  if (!state) return;
  if (isDecisionCheckerDeferredStale(tripId)) return;
  if (state.decisionChecker) {
    state.loading = false;
    notify(tripId);
    return;
  }
  if (state.deferred.status === 'failed') {
    state.loading = false;
    notify(tripId);
    return;
  }
  if (!state.deferred.taskId) return;
  if (state.pollPromise) return;

  state.loading = true;
  state.error = null;
  notify(tripId);

  state.pollPromise = pollUntilPlanningConflictsDecisionChecker(tripId, state.deferred, {
    intervalMs: state.pollIntervalMs,
  })
    .then((res) => {
      const dc = res.decisionChecker ?? null;
      state!.decisionChecker = dc;
      state!.loading = false;
      state!.error = dc ? null : '决策检查器未返回';
      state!.deferred = { ...state!.deferred, status: dc ? 'ready' : state!.deferred.status };
      notify(tripId);
      return dc;
    })
    .catch((err) => {
      state!.decisionChecker = null;
      state!.loading = false;
      state!.error = err instanceof Error ? err.message : '决策检查器加载失败';
      notify(tripId);
      return null;
    })
    .finally(() => {
      if (state) state.pollPromise = null;
    });
}
