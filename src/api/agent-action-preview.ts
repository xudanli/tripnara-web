/**
 * POST /api/agent/actions/preview — 采纳 healed_action_input 后的二次物理预览（与 route_and_run 解耦）。
 */

import apiClient from './client';
import type { AgentActionPreviewRequestBody, AgentActionPreviewResponseBody } from './agent';

export const AGENT_ACTION_PREVIEW_PATH = '/agent/actions/preview';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code?: string; message?: string };
}

type Wrap<T> = SuccessResponse<T> | ErrorResponse;

function unwrap<T>(response: { data: Wrap<T> | T }): T {
  const raw = response?.data as unknown;
  if (raw && typeof raw === 'object' && 'success' in raw) {
    const w = raw as Wrap<T>;
    if (w.success === false) {
      const err = (w as ErrorResponse).error;
      throw new Error(err?.message || err?.code || '预览请求失败');
    }
    if (w.success === true) {
      const d = (w as SuccessResponse<T>).data;
      if (d === undefined || d === null) throw new Error('API 响应 data 为空');
      return d;
    }
  }
  return raw as T;
}

export async function postAgentActionPreview(
  body: AgentActionPreviewRequestBody
): Promise<AgentActionPreviewResponseBody> {
  const res = await apiClient.post<Wrap<AgentActionPreviewResponseBody> | AgentActionPreviewResponseBody>(
    AGENT_ACTION_PREVIEW_PATH,
    body,
    {
      timeout: 120_000,
      headers: body.request_id ? { 'X-Request-Id': body.request_id } : undefined,
    }
  );
  return unwrap<AgentActionPreviewResponseBody>(res);
}
