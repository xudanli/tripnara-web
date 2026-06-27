import type { RouteAndRunResponse } from '@/api/agent';
import { parseRelaxationSuggestionsBundle } from '@/lib/relaxation-suggestions-parse.util';
import { publishRelaxationSuggestionsBundle } from '@/store/planStudioCompareStore';
import type { RelaxationSuggestionsBundle } from '@/types/relaxation-suggestions';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown> | null | undefined, ...keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** 从 route_and_run 响应提取 trip_id（供 Plan Studio store 投影） */
export function pickRouteRunResponseTripId(
  body: RouteAndRunResponse | null | undefined,
  fallbackTripId?: string | null,
): string | undefined {
  if (fallbackTripId?.trim()) return fallbackTripId.trim();
  if (!body) return undefined;

  const payload = asRecord(body.result?.payload);
  const observability = asRecord((body as Record<string, unknown>).observability);
  const route = asRecord(body.route);

  return (
    pickString(payload, 'trip_id', 'tripId') ??
    pickString(observability, 'trip_id', 'tripId') ??
    pickString(route, 'trip_id', 'tripId')
  );
}

/**
 * 将 BFF relaxation 投影写入 planStudioCompareStore，供 Plan Studio / Agent 共用。
 */
export function syncRelaxationSuggestionsFromRouteRun(
  body: RouteAndRunResponse | null | undefined,
  fallbackTripId?: string | null,
): RelaxationSuggestionsBundle | null {
  const bundle = parseRelaxationSuggestionsBundle(body);
  const tripId = pickRouteRunResponseTripId(body, fallbackTripId);

  if (tripId) {
    publishRelaxationSuggestionsBundle(tripId, bundle);
  }

  return bundle;
}

/** 是否应优先渲染 relaxation 条而非 clarificationQuestions 机器 options */
export function shouldPreferRelaxationSuggestionsUi(
  bundle: RelaxationSuggestionsBundle | null | undefined,
): boolean {
  return Boolean(bundle?.suggestions.length && bundle.context.questionId);
}
