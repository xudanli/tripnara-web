import type { RouteAndRunResponse } from '@/api/agent';

/**
 * payload.unified_execution_trace（蛇形/驼峰兼容）——轻量路径的可观测块，
 * 可与 explain / orchestration 并行携带 routing_task_type、decision_log、kb_rag_hit 等。
 */
export function getPayloadUnifiedTrace(
  payload: Record<string, unknown> | undefined | null
): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const t = payload.unified_execution_trace ?? payload.unifiedExecutionTrace;
  if (t && typeof t === 'object' && !Array.isArray(t)) return t as Record<string, unknown>;
  return undefined;
}

/**
 * 路由任务类型：优先 observability.routing_task_type，其次 trace，再 route / payload。
 * 勿仅用本地推断代替此后端权威字段。
 */
export function resolveRoutingTaskType(
  response: RouteAndRunResponse,
  payloadRecord: Record<string, unknown> | undefined
): string | undefined {
  const obs = response.observability as { routing_task_type?: string } | undefined;
  const fromObs = typeof obs?.routing_task_type === 'string' ? obs.routing_task_type.trim() : '';
  if (fromObs) return fromObs;

  const trace = getPayloadUnifiedTrace(payloadRecord);
  const fromTrace =
    typeof trace?.routing_task_type === 'string' ? trace.routing_task_type.trim() : '';
  if (fromTrace) return fromTrace;

  const fromRoute =
    typeof response.route.task_type === 'string' ? response.route.task_type.trim() : '';
  if (fromRoute) return fromRoute;

  const pt = payloadRecord?.task_type;
  return typeof pt === 'string' ? pt.trim() : undefined;
}

/**
 * 决策日志：orchestrationResult.decision_log → explain.decision_log → unified_execution_trace.decision_log。
 * 仅当前序非空数组才采用；否则继续 fallback（与「轻量路径无 state」对齐）。
 */
export function pickRawDecisionLogFromRouteRun(response: RouteAndRunResponse): unknown[] {
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const orch = payload?.orchestrationResult as { decision_log?: unknown[] } | undefined;
  if (Array.isArray(orch?.decision_log) && orch.decision_log.length > 0) return orch.decision_log;

  const explain = response.explain?.decision_log;
  if (Array.isArray(explain) && explain.length > 0) return explain as unknown[];

  const trace = getPayloadUnifiedTrace(payload);
  const fromTrace = trace?.decision_log;
  if (Array.isArray(fromTrace) && fromTrace.length > 0) return fromTrace;

  return [];
}

export function extractKbRagHitFromTrace(
  payloadRecord: Record<string, unknown> | undefined
): unknown {
  const trace = getPayloadUnifiedTrace(payloadRecord);
  if (!trace) return undefined;
  return trace.kb_rag_hit ?? trace.kbRagHit;
}

/** 调试条内嵌 JSON / 长文本截断 */
export function formatDebugJsonSnippet(v: unknown, maxLen = 280): string {
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s.length <= maxLen ? s : `${s.slice(0, maxLen)}…`;
  } catch {
    return String(v);
  }
}
