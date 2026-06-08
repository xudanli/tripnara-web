/**
 * route_and_run.request.trip_id 必须与数据库 Trip.id 一致（通常为 UUID）。
 * 页面占位符（如 trip_iceland_20260601）在库中无对应行程，会导致 decision / world.buildContext 报「行程不存在」。
 */

/** 标准 8-4-4-4-12 十六进制形式（服务端 Trip.id 常用 UUID） */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 常见错误：前端拼的 slug，非服务端下发主键 */
const PLACEHOLDER_TRIP_PREFIX = /^trip_/i;

/**
 * 是否可作为 route_and_run 的 trip_id 传给服务端（UUID + 非占位）。
 */
export function isValidRouteRunTripId(raw: string | null | undefined): boolean {
  return sanitizeRouteRunTripId(raw) != null;
}

/**
 * 返回可下发的 Trip.id，非法则 `null`（调用方应传 `null` 而非伪 ID）。
 */
export function sanitizeRouteRunTripId(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  if (PLACEHOLDER_TRIP_PREFIX.test(t)) return null;
  if (!UUID_RE.test(t)) return null;
  return t;
}
