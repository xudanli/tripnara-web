import type { RouteAndRunResponse, RouteRunAsyncTaskStatusResponse } from '@/api/agent';
import { agentApi } from '@/api/agent';
import { CONFIG } from '@/constants/config';
import {
  type RouteRunAsyncTaskStatusSnapshot,
} from '@/lib/route-run-async';
import { normalizeAgentTaskPollPath } from '@/lib/route-run-task-path';
import {
  attachTaskLeaseToSnapshot,
  isTaskLeaseExhausted,
  resolveTaskLeasePollIntervalMs,
} from '@/lib/task-lease-ui';
import { RouteRunTaskLeaseExhaustedError } from '@/lib/route-run-task-lease-errors';
import type { RouteAndRunTaskSsePayload } from '@/types/route-and-run-task-sse';
import { applyEmotionalContextFromSsePayload } from '@/lib/emotional-context-ui';

declare global {
  interface Window {
    _CONFIG__?: { apiBaseUrl?: string };
  }
}

function resolveApiBase(): string {
  return (
    window._CONFIG__?.apiBaseUrl ||
    import.meta.env.VITE_API_BASE_URL ||
    CONFIG.API_BASE_URL ||
    '/api'
  );
}

/** fetch SSE 用绝对 URL（与 axios baseURL 一致） */
export function resolveAgentApiUrl(relativePath: string): string {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const base = resolveApiBase().replace(/\/$/, '');
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}${path}`;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const basePath = base.startsWith('/') ? base : `/${base}`;
  return `${origin}${basePath}${path}`;
}

function readAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem('accessToken');
}

export function ssePayloadToPollSnapshot(
  payload: RouteAndRunTaskSsePayload
): RouteRunAsyncTaskStatusResponse {
  const status =
    payload.type === 'RESULT'
      ? 'SUCCESS'
      : payload.type === 'ERROR'
        ? 'FAILED'
        : payload.status === 'CANCELLED'
          ? 'CANCELLED'
          : 'PROCESSING';

  return {
    task_id: payload.task_id,
    status,
    current_phase: payload.current_phase,
    progress_percentage: payload.progress_percentage,
    message: payload.error?.trim() || payload.message,
    data: payload.type === 'RESULT' ? (payload.data ?? null) : null,
    request_id: payload.request_id,
    updated_at: payload.ts,
  };
}

function parseSseDataBlocks(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  return { events: parts, rest };
}

function parseSseEventBlock(block: string): { event?: string; data?: string } {
  let event: string | undefined;
  let data: string | undefined;
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data = line.slice(5).trim();
    }
  }
  return { event, data };
}

/** 业务终态失败（SSE ERROR / 无 data），不应再轮询兜底 */
export class RouteRunTaskTerminalError extends Error {
  readonly terminal = true as const;
  constructor(message: string) {
    super(message);
    this.name = 'RouteRunTaskTerminalError';
  }
}

export type SubscribeRouteAndRunTaskStreamOptions = {
  accessToken?: string | null;
  signal?: AbortSignal;
  onPayload: (payload: RouteAndRunTaskSsePayload) => void;
};

/**
 * fetch + ReadableStream 订阅 task SSE（支持 Bearer；生产推荐）。
 */
export async function subscribeRouteAndRunTaskStream(
  taskId: string,
  options: SubscribeRouteAndRunTaskStreamOptions
): Promise<void> {
  const url = resolveAgentApiUrl(`/agent/task/stream/${encodeURIComponent(taskId)}`);
  const token = options.accessToken ?? readAccessToken();

  const headers: Record<string, string> = { Accept: 'text/event-stream' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers, signal: options.signal, credentials: 'include' });
  if (!res.ok || !res.body) {
    throw new Error(`SSE ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseDataBlocks(buffer);
      buffer = rest;

      for (const block of events) {
        const { event, data } = parseSseEventBlock(block);
        if (!data) continue;
        if (data === '{}' || event === 'end') continue;

        const payload = JSON.parse(data) as RouteAndRunTaskSsePayload;
        applyEmotionalContextFromSsePayload(payload);
        options.onPayload(payload);

        if (payload.type === 'RESULT' || payload.type === 'ERROR') {
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export type AwaitRouteAndRunTaskCompletionOptions = {
  signal?: AbortSignal;
  onProgress?: (snap: RouteRunAsyncTaskStatusResponse) => void;
  /** SSE 失败后是否轮询兜底，默认 true */
  preferPollingFallback?: boolean;
  pollPath?: string;
  getTaskStatus?: (taskId: string) => Promise<RouteRunAsyncTaskStatusSnapshot<RouteAndRunResponse>>;
  /** STALE 且 SSE 长时间无事件时可选显式 resume（与 poll 自动 resume 等价） */
  enableExplicitResumeOnStale?: boolean;
};

function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
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
 * 与 SSE 并行：读 task_lease_v1、终态兜底、EXHAUSTED 早停。
 */
function startParallelTaskStatusPoll(
  taskId: string,
  options: {
    signal?: AbortSignal;
    defaultIntervalMs: number;
    getTaskStatus: (taskId: string) => Promise<RouteRunAsyncTaskStatusSnapshot<RouteAndRunResponse>>;
    onProgress?: (snap: RouteRunAsyncTaskStatusResponse) => void;
    isSettled: () => boolean;
    onTerminalSuccess: (data: RouteAndRunResponse) => void;
    onTerminalError: (err: Error) => void;
  }
): () => void {
  let stopped = false;
  const stop = () => {
    stopped = true;
  };

  void (async () => {
    let lastStaleResumeAt = 0;
    try {
      while (!stopped && !options.isSettled()) {
        if (options.signal?.aborted) return;

        const raw = await options.getTaskStatus(taskId);
        const snap = attachTaskLeaseToSnapshot(raw) as RouteRunAsyncTaskStatusResponse;
        if (stopped || options.isSettled()) return;

        options.onProgress?.(snap);

        if (isTaskLeaseExhausted(snap.task_lease_v1)) {
          options.onTerminalError(new RouteRunTaskLeaseExhaustedError(snap.message));
          return;
        }

        if (snap.status === 'SUCCESS' && snap.data) {
          options.onTerminalSuccess(snap.data);
          return;
        }

        if (snap.status === 'FAILED' || snap.status === 'CANCELLED') {
          options.onTerminalError(
            new RouteRunTaskTerminalError(snap.message?.trim() || '规划失败')
          );
          return;
        }

        const leaseStatus = snap.task_lease_v1?.lease_status;
        if (
          leaseStatus === 'STALE' &&
          Date.now() - lastStaleResumeAt > 45_000
        ) {
          lastStaleResumeAt = Date.now();
          try {
            await agentApi.resumeRouteRunTask(taskId);
          } catch {
            /* poll 路径仍会触发后端 auto-resume */
          }
        }

        const interval = resolveTaskLeasePollIntervalMs(leaseStatus, options.defaultIntervalMs);
        await sleepMs(interval, options.signal);
      }
    } catch (err) {
      if (stopped || options.isSettled()) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      options.onTerminalError(err instanceof Error ? err : new Error('任务状态轮询失败'));
    }
  })();

  return stop;
}

/**
 * 主路径：SSE 实时进度；失败时 fallback GET task/status（间隔见 CONFIG）。
 */
export async function awaitRouteAndRunTaskCompletion(
  taskId: string,
  pollPathOrOptions?: string | AwaitRouteAndRunTaskCompletionOptions,
  maybeOptions?: AwaitRouteAndRunTaskCompletionOptions
): Promise<RouteAndRunResponse> {
  const pollPath = typeof pollPathOrOptions === 'string' ? pollPathOrOptions : undefined;
  const options: AwaitRouteAndRunTaskCompletionOptions =
    typeof pollPathOrOptions === 'object' && pollPathOrOptions != null
      ? pollPathOrOptions
      : maybeOptions ?? {};

  const normalizedPollPath = normalizeAgentTaskPollPath(options.pollPath ?? pollPath, taskId);
  const defaultIntervalMs = CONFIG.API.ROUTE_RUN_ASYNC_POLL_INTERVAL_MS;
  const getTaskStatus =
    options.getTaskStatus ??
    (() => agentApi.getRouteRunTaskStatusByPath(normalizedPollPath));

  let lastProgressKey = '';
  const dedupeKey = (p: RouteAndRunTaskSsePayload) =>
    `${p.task_id}:${p.current_phase}:${p.progress_percentage}:${p.type}`;

  const emitProgress = (payload: RouteAndRunTaskSsePayload) => {
    const key = dedupeKey(payload);
    if (key === lastProgressKey) return;
    lastProgressKey = key;
    options.onProgress?.(ssePayloadToPollSnapshot(payload));
  };

  return new Promise<RouteAndRunResponse>((resolve, reject) => {
    let settled = false;
    let stopPoll: (() => void) | undefined;

    const finishSuccess = (data: RouteAndRunResponse) => {
      if (settled) return;
      settled = true;
      stopPoll?.();
      resolve(data);
    };

    const finishError = (err: Error) => {
      if (settled) return;
      settled = true;
      stopPoll?.();
      reject(err);
    };

    stopPoll = startParallelTaskStatusPoll(taskId, {
      signal: options.signal,
      defaultIntervalMs,
      getTaskStatus,
      onProgress: options.onProgress,
      isSettled: () => settled,
      onTerminalSuccess: finishSuccess,
      onTerminalError: finishError,
    });

    void subscribeRouteAndRunTaskStream(taskId, {
      signal: options.signal,
      onPayload: (payload) => {
        emitProgress(payload);
        if (payload.type === 'RESULT') {
          if (!payload.data) {
            finishError(new RouteRunTaskTerminalError('任务已完成，但未返回行程数据'));
            return;
          }
          finishSuccess(payload.data);
          return;
        }
        if (payload.type === 'ERROR') {
          finishError(
            new RouteRunTaskTerminalError(
              payload.error?.trim() || payload.message?.trim() || '规划失败'
            )
          );
        }
      },
    }).catch(() => {
      /* SSE 断线：parallel poll 继续兜底 */
    });

    options.signal?.addEventListener(
      'abort',
      () => {
        finishError(options.signal!.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}
