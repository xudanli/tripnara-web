import type { RouteAndRunResponse } from '@/api/agent';
import type { ChatMessage } from '@/hooks/useChatV2';

/** 规划助手 Chat：异步终态 data（route_and_run 整包）→ 气泡消息 */
export function chatMessageFromRouteAndRun(
  response: RouteAndRunResponse,
  id: string
): ChatMessage {
  const payload =
    response.result.payload && typeof response.result.payload === 'object'
      ? (response.result.payload as Record<string, unknown>)
      : undefined;

  return {
    id,
    role: 'assistant',
    content: response.result.answer_text?.trim() || '行程已生成',
    timestamp: new Date(),
    phase: typeof payload?.phase === 'string' ? payload.phase : undefined,
    routing: { target: 'generate', reason: 'async_route_and_run', reasonCN: '异步规划完成' },
    plans: Array.isArray(payload?.plans) ? (payload.plans as ChatMessage['plans']) : undefined,
    orchestrationResult: payload?.orchestrationResult as ChatMessage['orchestrationResult'],
    ui_state: payload?.ui_state as ChatMessage['ui_state'],
    asyncTaskPending: false,
  };
}
