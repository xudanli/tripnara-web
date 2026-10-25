/**
 * route_and_run.request.trip_id 必须与数据库 Trip.id 一致。
 * - 常用：UUID
 * - 亦见：`trip_` + 十六进制后缀（如 trip_15c50a69931845ca）
 * 页面占位符（如 trip_iceland_20260601）在库中无对应行程，会导致 decision / world.buildContext 报「行程不存在」。
 */

/** 标准 8-4-4-4-12 十六进制形式（服务端 Trip.id 常用 UUID） */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 服务端偶发的 opaque id：`trip_` + 足够长的十六进制（非英文 slug）。
 * 例：trip_15c50a69931845ca
 */
const TRIP_PREFIXED_HEX_RE = /^trip_[0-9a-f]{12,}$/i;

/**
 * 人类可读占位：trip_iceland_20260601、trip_demo_xxx 等（含非十六进制段）。
 * 注意：须在 hex 形式校验之后再判，避免误伤合法 opaque id。
 */
function isPlaceholderTripSlug(raw: string): boolean {
  if (!/^trip_/i.test(raw)) return false;
  if (TRIP_PREFIXED_HEX_RE.test(raw)) return false;
  // trip_ 后仍含字母/下划线混排的可读 slug
  return /^trip_[a-z0-9]+(_[a-z0-9]+)+$/i.test(raw) || /[g-z]/i.test(raw.replace(/^trip_/i, ''));
}

/**
 * 是否可作为 route_and_run 的 trip_id 传给服务端。
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
  if (UUID_RE.test(t)) return t;
  if (TRIP_PREFIXED_HEX_RE.test(t)) return t;
  if (isPlaceholderTripSlug(t)) return null;
  return null;
}
