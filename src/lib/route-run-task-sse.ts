import type { RouteAndRunResponse, RouteRunAsyncTaskStatusResponse } from '@/api/agent';
import { agentApi } from '@/api/agent';
import { CONFIG } from '@/constants/config';
import {
  pollRouteRunTaskUntilDone,
  type RouteRunAsyncTaskStatusSnapshot,
} from '@/lib/route-run-async';
import { normalizeAgentTaskPollPath } from '@/lib/route-run-task-path';
import type { RouteAndRunTaskSsePayload } from '@/types/route-and-run-task-sse';

declare global {
  interface Window {
    __CONFIG__?: { apiBaseUrl?: string };
  }
}

function resolveApiBase(): string {
  return (
    window.__CONFIG__?.apiBaseUrl ||
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
};

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

  let lastProgressKey = '';
  const dedupeKey = (p: RouteAndRunTaskSsePayload) =>
    `${p.task_id}:${p.current_phase}:${p.progress_percentage}:${p.type}`;

  const emitProgress = (payload: RouteAndRunTaskSsePayload) => {
    const key = dedupeKey(payload);
    if (key === lastProgressKey) return;
    lastProgressKey = key;
    options.onProgress?.(ssePayloadToPollSnapshot(payload));
  };

  const runSse = (): Promise<RouteAndRunResponse> =>
    new Promise((resolve, reject) => {
      let settled = false;

      void subscribeRouteAndRunTaskStream(taskId, {
        signal: options.signal,
        onPayload: (payload) => {
          emitProgress(payload);
          if (payload.type === 'RESULT') {
            if (!payload.data) {
              if (!settled) {
                settled = true;
                reject(new RouteRunTaskTerminalError('任务已完成，但未返回行程数据'));
              }
              return;
            }
            if (!settled) {
              settled = true;
              resolve(payload.data);
            }
            return;
          }
          if (payload.type === 'ERROR') {
            if (!settled) {
              settled = true;
              reject(
                new RouteRunTaskTerminalError(
                  payload.error?.trim() || payload.message?.trim() || '规划失败'
                )
              );
            }
          }
        },
      })
        .then(() => {
          if (!settled) {
            settled = true;
            reject(new Error('SSE 已结束但未收到 RESULT'));
          }
        })
        .catch((e) => {
          if (!settled) {
            settled = true;
            reject(e);
          }
        });
    });

  try {
    return await runSse();
  } catch (err) {
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new DOMException('Aborted', 'AbortError');
    }
    if (err instanceof RouteRunTaskTerminalError) {
      throw err;
    }
    if (options.preferPollingFallback === false) {
      throw err instanceof Error ? err : new Error('SSE failed');
    }

    return pollRouteRunTaskUntilDone(taskId, {
      signal: options.signal,
      onProgress: options.onProgress,
      getTaskStatus:
        options.getTaskStatus ??
        (() => agentApi.getRouteRunTaskStatusByPath(normalizedPollPath)),
    });
  }
}
