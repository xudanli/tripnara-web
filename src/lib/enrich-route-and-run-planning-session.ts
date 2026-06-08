import type { RouteAndRunRequest } from '@/api/agent';
import {
  ensurePlanningAssistantV2Session,
  getPlanningAssistantV2SessionId,
} from '@/lib/planning-assistant-session-reset';

function attachClientSessionId(
  request: RouteAndRunRequest,
  sessionId: string
): RouteAndRunRequest {
  return {
    ...request,
    options: {
      ...request.options,
      client_session_id: sessionId,
    },
  };
}

/** 同步兜底：从 localStorage 注入（无法创建 session 时用） */
export function enrichRouteAndRunRequestWithPlanningSession(
  request: RouteAndRunRequest
): RouteAndRunRequest {
  const existing = request.options?.client_session_id?.trim();
  if (existing) return request;

  const sessionId = getPlanningAssistantV2SessionId();
  if (!sessionId) return request;

  return attachClientSessionId(request, sessionId);
}

/**
 * 发送 route_and_run 前 ensure 规划助手 session，写入 options.client_session_id。
 * 所有 invokeRouteAndRun / executeRouteAndRun 入口应走此函数。
 */
export async function enrichRouteAndRunRequestWithPlanningSessionAsync(
  request: RouteAndRunRequest
): Promise<RouteAndRunRequest> {
  const existing = request.options?.client_session_id?.trim();
  if (existing) return request;

  const sessionId = await ensurePlanningAssistantV2Session(request.user_id);
  return attachClientSessionId(request, sessionId);
}
