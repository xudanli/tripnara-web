import type { AgentOptions, SuggestedOperation } from '@/api/agent';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';

export type RouteRunIntentModeOption = NonNullable<AgentOptions['intent_mode']>;

/**
 * 从快捷操作 `payload` 读取 `intent_mode` / `intentMode`（与下一轮 `options.intent_mode` 对齐）。
 */
export function parseIntentModeFromSuggestedPayload(
  payload: Record<string, unknown> | SuggestedOperation['payload'] | undefined
): RouteRunIntentModeOption | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const raw = (payload as Record<string, unknown>).intent_mode ?? (payload as Record<string, unknown>).intentMode;
  if (typeof raw !== 'string') return undefined;
  const u = raw.trim().toUpperCase();
  if (u === 'AUTO') return 'AUTO';
  if (u === 'TRIP_PLANNING' || u === 'PLANNING') return 'TRIP_PLANNING';
  if (u === 'DATA_LOOKUP' || u === 'LOOKUP') return 'DATA_LOOKUP';
  if (u === 'GENERIC_QA' || u === 'QA') return 'GENERIC_QA';
  return undefined;
}

const ALLOWED_CLIENT_ROUTES = new Set([
  'timeline',
  'replay',
  'planning',
  'itinerary',
  'decision_cockpit',
]);

/**
 * 解析 result.payload.suggested_operations：去重 id、校验 kind。
 */
export function normalizeSuggestedOperations(raw: unknown): SuggestedOperation[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: SuggestedOperation[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const kind = o.kind as string | undefined;
    if (!id || !label) continue;
    if (seen.has(id)) continue;
    if (kind !== 'route_and_run_message' && kind !== 'client_navigation') continue;
    seen.add(id);
    const payload =
      o.payload && typeof o.payload === 'object' && !Array.isArray(o.payload)
        ? (o.payload as SuggestedOperation['payload'])
        : undefined;
    out.push({
      id,
      label,
      kind: kind as SuggestedOperation['kind'],
      ...(payload ? { payload } : {}),
    });
  }
  return out.length > 0 ? out : undefined;
}

/**
 * SPA 导航路径（client_navigation）；须合法 trip 的路径会先做 UUID 校验。
 */
export function pathForSuggestedClientNavigation(
  route: string,
  tripIdRaw: string | undefined
): string | null {
  const r = route.trim();
  if (!ALLOWED_CLIENT_ROUTES.has(r)) return null;
  const tid = tripIdRaw?.trim();
  const tripOk = tid ? sanitizeRouteRunTripId(tid) : undefined;

  switch (r) {
    case 'timeline':
      return tripOk ? `/dashboard/trips/${tripOk}/schedule` : null;
    case 'replay':
      return tripOk
        ? `/dashboard/plan-studio?tripId=${encodeURIComponent(tripOk)}&mode=debug&agentOpen=1`
        : '/dashboard/plan-studio?mode=debug&agentOpen=1';
    case 'planning':
      return tripOk
        ? `/dashboard/plan-studio?tripId=${encodeURIComponent(tripOk)}`
        : '/dashboard/plan-studio';
    case 'decision_cockpit':
      return tripOk
        ? `/dashboard/plan-studio?tripId=${encodeURIComponent(tripOk)}&decisionCockpit=1`
        : '/dashboard/plan-studio?decisionCockpit=1';
    case 'itinerary':
      return tripOk ? `/dashboard/trips/${tripOk}` : null;
    default:
      return null;
  }
}
