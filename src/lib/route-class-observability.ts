import type { ObservabilityMetrics, RouteAndRunResponse } from '@/api/agent';
import {
  isRouteClassEvalV1,
  isRouteClassForkV1,
  type RouteClassEvalV1,
  type RouteClassForkV1,
} from '@/types/route-class-observability';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

/** 合并 meta.observability 与顶层 observability（顶层优先） */
export function resolveRouteRunObservabilityRecord(
  response: RouteAndRunResponse | null | undefined
): Record<string, unknown> {
  if (!response) return {};
  const top = asRecord(response.observability) ?? {};
  const meta = asRecord(response.meta?.observability);
  return meta ? { ...meta, ...top } : top;
}

/**
 * 优先读 observability 顶层 `route_class_fork_v1`；
 * 缺省时回退 `observability.trace.route_class_fork_v1`（兼容旧响应）。
 */
export function pickRawRouteClassForkFromObservability(
  obs: ObservabilityMetrics | Record<string, unknown> | null | undefined
): unknown {
  const rec = asRecord(obs);
  if (!rec) return undefined;
  if (rec.route_class_fork_v1 != null) return rec.route_class_fork_v1;
  return asRecord(rec.trace)?.route_class_fork_v1;
}

/**
 * 优先读 observability 顶层 `route_class_eval_v1`；
 * 缺省时回退 `observability.trace.route_class_eval_v1`（兼容旧响应）。
 */
export function pickRawRouteClassEvalFromObservability(
  obs: ObservabilityMetrics | Record<string, unknown> | null | undefined
): unknown {
  const rec = asRecord(obs);
  if (!rec) return undefined;
  if (rec.route_class_eval_v1 != null) return rec.route_class_eval_v1;
  return asRecord(rec.trace)?.route_class_eval_v1;
}

export function pickRouteClassForkFromRouteRun(
  response: RouteAndRunResponse | null | undefined
): RouteClassForkV1 | null {
  if (!response) return null;
  const raw = pickRawRouteClassForkFromObservability(resolveRouteRunObservabilityRecord(response));
  return isRouteClassForkV1(raw) ? raw : null;
}

export function pickRouteClassEvalFromRouteRun(
  response: RouteAndRunResponse | null | undefined
): RouteClassEvalV1 | null {
  if (!response) return null;
  const raw = pickRawRouteClassEvalFromObservability(resolveRouteRunObservabilityRecord(response));
  return isRouteClassEvalV1(raw) ? raw : null;
}

export function pickRouteClassObservabilityFromRouteRun(
  response: RouteAndRunResponse | null | undefined
): { fork: RouteClassForkV1 | null; eval: RouteClassEvalV1 | null } {
  return {
    fork: pickRouteClassForkFromRouteRun(response),
    eval: pickRouteClassEvalFromRouteRun(response),
  };
}

/** Debug 条：优先 chosen_class / drift_detected，否则 JSON 摘要 */
export function formatRouteClassForkDebugSnippet(fork: RouteClassForkV1 | null | undefined): string {
  if (!fork) return '—';
  const chosen = typeof fork.chosen_class === 'string' ? fork.chosen_class.trim() : '';
  if (chosen) {
    const from = typeof fork.fork_from === 'string' ? fork.fork_from.trim() : '';
    return from ? `${chosen} ← ${from}` : chosen;
  }
  try {
    const s = JSON.stringify(fork);
    return s.length <= 120 ? s : `${s.slice(0, 120)}…`;
  } catch {
    return String(fork);
  }
}

export function formatRouteClassEvalDebugSnippet(evalObs: RouteClassEvalV1 | null | undefined): string {
  if (!evalObs) return '—';
  const drift =
    evalObs.drift_detected === true ? 'drift' : evalObs.drift_detected === false ? 'stable' : null;
  const expected = typeof evalObs.expected_class === 'string' ? evalObs.expected_class.trim() : '';
  const actual = typeof evalObs.actual_class === 'string' ? evalObs.actual_class.trim() : '';
  if (drift || expected || actual) {
    const parts = [drift, expected && actual ? `${expected}→${actual}` : expected || actual].filter(
      Boolean
    );
    return parts.join(' · ');
  }
  try {
    const s = JSON.stringify(evalObs);
    return s.length <= 120 ? s : `${s.slice(0, 120)}…`;
  } catch {
    return String(evalObs);
  }
}
