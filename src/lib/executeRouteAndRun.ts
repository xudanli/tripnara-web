import {
  agentApi,
  type RouteAndRunRequest,
  type RouteAndRunResponse,
  type RouteRunAsyncTaskStatusResponse,
} from '@/api/agent';
import {
  handleRouteAndRunResponse,
  pickAsyncTask,
  type RouteAndRunHandlers,
  type RouteAndRunResponseBody,
} from '@/lib/handleRouteAndRunResponse';
import { shouldUseRouteRunAsync } from '@/lib/route-run-async';
import { normalizeAgentTaskPollPath } from '@/lib/route-run-task-path';
import { awaitRouteAndRunTaskCompletion } from '@/lib/route-run-task-sse';
import { enrichRouteAndRunRequestWithPlanningSessionAsync } from '@/lib/enrich-route-and-run-planning-session';
import { enrichRouteAndRunRequestWithDsoVersion } from '@/lib/trip-dso-version';
import { enrichRouteAndRunRequestWithEmotionalMetadata } from '@/lib/enrich-route-and-run-emotional-metadata';
import { enrichRouteAndRunRequestWithTravelCompiler } from '@/lib/enrich-route-and-run-travel-compiler';
import { markPlanningTaskProcessing } from '@/lib/sync-planning-task-store';
import { syncPlanningTaskFromPollSnapshot } from '@/lib/sync-planning-task-store';

export type ExecuteRouteAndRunOptions = {
  signal?: AbortSignal;
  onProgress?: (snap: RouteRunAsyncTaskStatusResponse) => void;
  /** 200 嵌 async_task 时先处理首包（Intake OFF 勿只等 task SSE） */
  onInitialRouteRunBody?: (body: RouteAndRunResponse) => void;
  forceSync?: boolean;
  forceAsync?: boolean;
};

function resolveAsyncMode(
  request: RouteAndRunRequest,
  options?: ExecuteRouteAndRunOptions
): 'OFF' | 'AUTO' | 'FORCE' {
  if (options?.forceSync) return 'OFF';
  if (options?.forceAsync) return 'FORCE';
  const explicit = request.options?.async_mode;
  if (explicit === 'OFF' || explicit === 'AUTO' || explicit === 'FORCE') return explicit;
  if (
    shouldUseRouteRunAsync({
      intentMode: request.options?.intent_mode,
      entryPoint: request.options?.entry_point,
      hasBoundTripId: Boolean(request.trip_id?.trim() || request.tripId?.trim()),
      message: request.message,
    })
  ) {
    return 'AUTO';
  }
  return 'OFF';
}

function wrapProgress(
  onProgress?: (snap: RouteRunAsyncTaskStatusResponse) => void
): (snap: RouteRunAsyncTaskStatusResponse) => void {
  return (snap) => {
    syncPlanningTaskFromPollSnapshot(snap);
    onProgress?.(snap);
  };
}

/**
 * 主链路：POST route_and_run（含 async_mode）→ 分发 → SSE 进度（失败则轮询兜底）→ 终态再分发。
 */
export async function executeRouteAndRun(
  request: RouteAndRunRequest,
  handlers: RouteAndRunHandlers,
  options?: ExecuteRouteAndRunOptions
): Promise<void> {
  const resolvedAsync = resolveAsyncMode(request, options);
  const attachAsyncMode =
    options?.forceAsync === true ||
    options?.forceSync === true ||
    request.options?.async_mode !== undefined;
  const withSession = await enrichRouteAndRunRequestWithPlanningSessionAsync({
    ...request,
    options: attachAsyncMode
      ? { ...request.options, async_mode: resolvedAsync }
      : { ...request.options },
  });
  const payload = enrichRouteAndRunRequestWithTravelCompiler(
    enrichRouteAndRunRequestWithEmotionalMetadata(
      enrichRouteAndRunRequestWithDsoVersion(withSession),
    ),
  );

  if (import.meta.env.DEV && !payload.options?.client_session_id?.trim()) {
    console.warn('[executeRouteAndRun] missing options.client_session_id after enrich');
  }

  const invoked = await agentApi.routeAndRunInvoke(payload);

  if (invoked.kind === 'async') {
    handlers.onAsyncStart(invoked.taskId, invoked.pollPath);
    markPlanningTaskProcessing(invoked.taskId, invoked.pollPath);

    const data = await awaitRouteAndRunTaskCompletion(invoked.taskId, {
      signal: options?.signal,
      onProgress: wrapProgress(options?.onProgress),
      pollPath: invoked.pollPath,
      getTaskStatus: () => agentApi.getRouteRunTaskStatusByPath(invoked.pollPath),
    });

    handleRouteAndRunResponse(data as RouteAndRunResponseBody, handlers);
    return;
  }

  const syncBody = invoked.response as RouteAndRunResponseBody;
  const embeddedAsync = pickAsyncTask(syncBody);
  if (embeddedAsync?.task_id) {
    const pollPath = normalizeAgentTaskPollPath(embeddedAsync.poll_path, embeddedAsync.task_id);
    handlers.onAsyncStart(embeddedAsync.task_id, pollPath);
    markPlanningTaskProcessing(embeddedAsync.task_id, pollPath);
    options?.onInitialRouteRunBody?.(syncBody);
    const data = await awaitRouteAndRunTaskCompletion(embeddedAsync.task_id, {
      signal: options?.signal,
      onProgress: wrapProgress(options?.onProgress),
      pollPath,
      getTaskStatus: () => agentApi.getRouteRunTaskStatusByPath(pollPath),
    });
    handleRouteAndRunResponse(data as RouteAndRunResponseBody, handlers);
    return;
  }

  handleRouteAndRunResponse(syncBody, handlers);
}

/** 兼容旧调用方：收集终态整包（含 NEED_MORE_INFO 澄清） */
export async function invokeRouteAndRun(
  request: RouteAndRunRequest,
  options?: ExecuteRouteAndRunOptions
): Promise<RouteAndRunResponse> {
  let settled: RouteAndRunResponse | null = null;

  await executeRouteAndRun(
    request,
    {
      onAsyncStart: () => {
        /* 轮询进度由 store / onProgress 负责 */
      },
      onClarification: (_payload, body) => {
        settled = body;
      },
      onSuccess: (body) => {
        settled = body;
      },
      onFailed: (body) => {
        settled = body;
        const status = body.result?.status;
        if (status === 'FAILED' || status === 'TIMEOUT') {
          const msg = body.result?.answer_text?.trim() || '请求失败';
          throw new Error(msg);
        }
      },
    },
    options
  );

  if (!settled) {
    throw new Error('未收到 route_and_run 响应');
  }
  return settled;
}
