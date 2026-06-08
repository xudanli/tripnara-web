import type { ResultStatus, RouteAndRunResponse, UIStatus } from '@/api/agent';
import { isClarifyResponse } from '@/lib/route-run-clarification';
import { normalizeAgentTaskPollPath } from '@/lib/route-run-task-path';
import { applyRouteAndRunToStore } from '@/lib/world-model-guards';

export { isClarifyResponse } from '@/lib/route-run-clarification';

export interface RouteAndRunAsyncTaskEnvelope {
  is_async_delegated?: boolean;
  task_id: string;
  poll_path?: string;
}

/** 同步 200 / 202 首包 / 轮询终态 data 的统一入参 */
export type RouteAndRunResponseBody = RouteAndRunResponse & {
  async_task?: RouteAndRunAsyncTaskEnvelope;
};

export type RouteAndRunResultPayload = NonNullable<RouteAndRunResponse['result']['payload']>;

export type RouteAndRunHandlers = {
  onAsyncStart: (taskId: string, pollPath: string) => void;
  onClarification: (payload: RouteAndRunResultPayload | undefined, body: RouteAndRunResponse) => void;
  onSuccess: (body: RouteAndRunResponse) => void;
  onFailed: (body: RouteAndRunResponse) => void;
  onRedirect?: (body: RouteAndRunResponse) => void;
  onConsent?: (body: RouteAndRunResponse) => void;
  onNegotiation?: (body: RouteAndRunResponse) => void;
};

export function pickAsyncTask(body: RouteAndRunResponseBody): RouteAndRunAsyncTaskEnvelope | null {
  const t = body.async_task;
  if (!t?.task_id?.trim()) return null;
  if (t.is_async_delegated === false) return null;
  return t;
}

/**
 * 统一响应分发：同步 200、202 async_task、轮询 SUCCESS 的 task.data 均走此函数。
 * 优先级：async_task → REDIRECT/CONSENT/协商 → NEED_MORE_INFO / NEED_CONFIRMATION → OK → failed
 */
export function handleRouteAndRunResponse(body: RouteAndRunResponseBody, h: RouteAndRunHandlers): void {
  const asyncTask = pickAsyncTask(body);
  if (asyncTask?.task_id) {
    h.onAsyncStart(
      asyncTask.task_id,
      normalizeAgentTaskPollPath(asyncTask.poll_path, asyncTask.task_id)
    );
    return;
  }

  const status = body.result?.status as ResultStatus | undefined;
  const payload = body.result?.payload;

  if (status === 'REDIRECT_REQUIRED' && h.onRedirect) {
    h.onRedirect(body);
    return;
  }

  if (status === 'NEED_CONSENT' && h.onConsent) {
    h.onConsent(body);
    return;
  }

  if (payload?.negotiation_payload?.status === 'PENDING_USER_DECISION' && h.onNegotiation) {
    h.onNegotiation(body);
    return;
  }

  if (isClarifyResponse(body) || status === 'NEED_CONFIRMATION') {
    h.onClarification(payload, body);
    return;
  }

  if (status === 'OK') {
    applyRouteAndRunToStore(body);
    h.onSuccess(body);
    return;
  }

  h.onFailed(body);
}

/**
 * 展示用 UI 状态：以 result.status 为准，勿单独用 ui_state.ui_status === 'thinking' 盖过澄清态。
 */
export function resolveRouteAndRunDisplayStatus(
  response: RouteAndRunResponse,
  options?: { forceClarifying?: boolean }
): UIStatus {
  if (options?.forceClarifying) return 'awaiting_user_input';

  const status = String(response.result?.status ?? '').toUpperCase();

  if (status === 'NEED_MORE_INFO' || status === 'NEED_CONFIRMATION') {
    return 'awaiting_user_input';
  }
  if (status === 'NEED_CONSENT') return 'awaiting_consent';
  if (status === 'FAILED' || status === 'TIMEOUT') return 'failed';

  if (status === 'OK') {
    const hint = response.route?.ui_hint?.status;
    if (hint && hint !== 'thinking') return hint as UIStatus;
    return 'done';
  }

  const uiStateStatus = response.ui_state?.ui_status;
  if (uiStateStatus && uiStateStatus !== 'thinking') {
    return uiStateStatus as UIStatus;
  }

  const routeHint = response.route?.ui_hint?.status;
  if (routeHint && routeHint !== 'thinking') return routeHint as UIStatus;

  return 'done';
}

export function isRouteAndRunClarificationStatus(response: RouteAndRunResponse): boolean {
  const s = String(response.result?.status ?? '').toUpperCase();
  return s === 'NEED_MORE_INFO' || s === 'NEED_CONFIRMATION';
}

export function shouldShowRouteRunThinking(opts: {
  httpInFlight: boolean;
  planningTaskProcessing: boolean;
}): boolean {
  return opts.planningTaskProcessing || opts.httpInFlight;
}
