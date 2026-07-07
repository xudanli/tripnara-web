import type { EntryPoint } from '@/api/agent';
import { CONFIG } from '@/constants/config';
import {
  isTaskLeaseExhausted,
  resolveTaskLeasePollIntervalMs,
  taskLeaseProgressLabel,
} from '@/lib/task-lease-ui';
import { RouteRunTaskLeaseExhaustedError } from '@/lib/route-run-task-lease-errors';
import {
  looksLikeRouteRunLightLookupRequest,
  looksLikeTripPlanningRequest,
} from '@/lib/route-run-intent-heuristics';

import type { TaskLeaseEchoV1 } from '@/types/task-lease';

export type RouteRunAsyncPhase =
  | 'INTENT_COMPILE'
  | 'INTAKE'
  | 'RESEARCH'
  | 'PLAN_GEN'
  | 'TRAVEL_COMPILE'
  | 'VERIFY'
  | 'REPAIR'
  | 'NARRATE'
  | (string & {});

export type RouteRunAsyncTaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

/** 轮询中间态（SUCCESS 时 data 由调用方泛型约束） */
export interface RouteRunAsyncTaskStatusSnapshot<TData = unknown> {
  task_id: string;
  status: RouteRunAsyncTaskStatus;
  current_phase?: RouteRunAsyncPhase;
  progress_percentage?: number;
  message?: string;
  data?: TData | null;
  request_id?: string;
  updated_at?: string;
  /** tripnara.route_and_run_task_lease@v1 — 仅 poll task/status 携带 */
  task_lease_v1?: TaskLeaseEchoV1;
}

const TERMINAL_STATUSES: ReadonlySet<RouteRunAsyncTaskStatus> = new Set([
  'SUCCESS',
  'FAILED',
  'CANCELLED',
]);

/** current_phase → 前端展示（与 orchestration-step-display.constants 对齐） */
const PHASE_DISPLAY: Record<string, string> = {
  INTENT_COMPILE: '意图编译',
  INTAKE: '需求接入',
  RESEARCH: '数据调研',
  POI_SELECTION: '兴趣点选择',
  GATE_EVAL: '门禁评估',
  PLAN_GEN: '方案生成',
  TRAVEL_COMPILE: 'CTRE 旅行编译',
  VERIFY: '可执行性验证',
  REPAIR: '修复编排',
  NARRATE: '决策叙事',
  DONE: '已完成',
};

export function isRouteRunAsyncTerminalStatus(
  status: RouteRunAsyncTaskStatus | string | undefined
): boolean {
  return status != null && TERMINAL_STATUSES.has(status as RouteRunAsyncTaskStatus);
}

export function phaseDisplayLabel(phase: RouteRunAsyncPhase | string | undefined): string | undefined {
  if (!phase || typeof phase !== 'string') return undefined;
  const key = phase.trim().toUpperCase();
  return PHASE_DISPLAY[key] ?? phase;
}

/**
 * 轮询态展示文案：优先后端 message，其次 phase 映射，最后兜底。
 */
export function formatRouteRunAsyncProgressLabel(
  snap: Pick<
    RouteRunAsyncTaskStatusSnapshot,
    'message' | 'current_phase' | 'progress_percentage' | 'status' | 'task_lease_v1'
  >
): string {
  const leaseLabel = taskLeaseProgressLabel(snap.task_lease_v1);
  if (leaseLabel) return leaseLabel;

  const serverMsg = snap.message?.trim();
  if (serverMsg) {
    const pct =
      typeof snap.progress_percentage === 'number' && Number.isFinite(snap.progress_percentage)
        ? `（${Math.round(snap.progress_percentage)}%）`
        : '';
    return `${serverMsg}${pct}`;
  }

  const phaseLabel = phaseDisplayLabel(snap.current_phase);
  if (phaseLabel) {
    const pct =
      typeof snap.progress_percentage === 'number' && Number.isFinite(snap.progress_percentage)
        ? ` ${Math.round(snap.progress_percentage)}%`
        : '';
    return `${phaseLabel}${pct}`;
  }

  if (snap.status === 'PROCESSING' || snap.status === 'PENDING') return '规划师正在处理…';
  return '规划师正在思考…';
}

export type PollRouteRunTaskOptions<TData> = {
  intervalMs?: number;
  signal?: AbortSignal;
  onProgress?: (snap: RouteRunAsyncTaskStatusSnapshot<TData>) => void;
  getTaskStatus: (taskId: string) => Promise<RouteRunAsyncTaskStatusSnapshot<TData>>;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(signal!.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * 轮询 GET /agent/task/status/{task_id}，终态 SUCCESS 时返回 data。
 */
export async function pollRouteRunTaskUntilDone<TData>(
  taskId: string,
  options: PollRouteRunTaskOptions<TData>
): Promise<TData> {
  const baseIntervalMs = options.intervalMs ?? CONFIG.API.ROUTE_RUN_ASYNC_POLL_INTERVAL_MS;

  for (;;) {
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    const snap = await options.getTaskStatus(taskId);
    options.onProgress?.(snap);

    const leaseStatus = snap.task_lease_v1?.lease_status;
    if (isTaskLeaseExhausted(snap.task_lease_v1)) {
      throw new RouteRunTaskLeaseExhaustedError(snap.message);
    }

    if (snap.status === 'SUCCESS') {
      if (snap.data == null) {
        throw new Error('任务已完成，但未返回行程数据');
      }
      return snap.data;
    }

    if (snap.status === 'FAILED') {
      throw new Error(snap.message?.trim() || '行程规划失败');
    }

    if (snap.status === 'CANCELLED') {
      throw new Error(snap.message?.trim() || '任务已取消');
    }

    const intervalMs = resolveTaskLeasePollIntervalMs(leaseStatus, baseIntervalMs);
    await sleep(intervalMs, options.signal);
  }
}

export type RouteRunAsyncEligibilityInput = {
  intentMode?: string;
  entryPoint?: EntryPoint;
  hasBoundTripId?: boolean;
  message?: string;
};

/**
 * 是否走 async + 轮询（与 AgentChat 意图升格对齐）：
 * - TRIP_PLANNING：是
 * - DATA_LOOKUP / GENERIC_QA：否
 * - AUTO：规划工作台、规划类话术、或已绑行程且非轻量检索话术 → 是（覆盖后端实际走 S2 规划的模糊句）
 */
export function shouldUseRouteRunAsync(input: RouteRunAsyncEligibilityInput | string | undefined): boolean {
  const ctx: RouteRunAsyncEligibilityInput =
    typeof input === 'string' ? { intentMode: input } : input ?? {};
  const mode = ctx.intentMode?.trim().toUpperCase();
  if (mode === 'TRIP_PLANNING') return true;
  if (mode === 'DATA_LOOKUP' || mode === 'GENERIC_QA') return false;
  if (mode !== 'AUTO') return false;

  const msg = ctx.message?.trim() ?? '';
  if (msg && looksLikeRouteRunLightLookupRequest(msg)) return false;

  if (ctx.entryPoint === 'planning_workbench') return true;
  if (msg && looksLikeTripPlanningRequest(msg)) return true;

  if (ctx.hasBoundTripId) {
    return true;
  }

  return false;
}
