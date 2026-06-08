import type { CarRentalItem } from '@/components/planning-assistant-v2/CarRentalList';

function normalizeAuditSuccessFlag(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'success' || s === 'ok' || s === 'succeeded' || s === 'passed';
  }
  return false;
}

function readCarRentalAuditBlock(audit: Record<string, unknown>): Record<string, unknown> | null {
  const raw = audit.car_rental ?? audit.carRental;
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string' && normalizeAuditSuccessFlag(raw)) {
    return { status: raw };
  }
  return null;
}

/**
 * `live_sensor_audit` 中租车通道是否成功（与 `result.payload.car_rentals` 成对用于前端是否渲染卡片）。
 * 兼容 `car_rental` / `carRental` 对象或字符串、`channels.car_rental`、扁平 `car_rental_status` 等。
 */
export function isLiveSensorCarRentalSucceeded(
  audit: Record<string, unknown> | undefined
): boolean {
  if (!audit || typeof audit !== 'object') return false;

  if (audit.car_rental === true || audit.carRental === true) return true;
  if (audit.car_rental === false || audit.carRental === false) return false;

  const block = readCarRentalAuditBlock(audit);
  if (block) {
    if (block.failed === true || block.error != null) return false;
    if (normalizeAuditSuccessFlag(block.success)) return true;
    if (normalizeAuditSuccessFlag(block.status)) return true;
    if (block.ok === true) return true;
  }

  if (typeof audit.car_rental === 'string' && normalizeAuditSuccessFlag(audit.car_rental)) {
    return true;
  }
  if (audit.car_rental_ok === true) return true;
  if (normalizeAuditSuccessFlag(audit.car_rental_status)) return true;
  if (normalizeAuditSuccessFlag(audit.car_rental_success)) return true;

  const channels = audit.channels;
  if (channels && typeof channels === 'object' && !Array.isArray(channels)) {
    const ch = channels as Record<string, unknown>;
    const nested = ch.car_rental ?? ch.carRental;
    if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
      const o = nested as Record<string, unknown>;
      if (o.failed === true || o.error != null) return false;
      if (normalizeAuditSuccessFlag(o.success) || normalizeAuditSuccessFlag(o.status) || o.ok === true) {
        return true;
      }
    }
    if (typeof nested === 'string' && normalizeAuditSuccessFlag(nested)) return true;
  }

  return false;
}

export interface CarRentalSearchMeta {
  fallback_dates_used?: boolean;
}

/**
 * `car_rental_search_meta.fallback_dates_used`：后端用兜底日期查价时置 true，前端提示用户在工作台补全日期。
 */
export function extractCarRentalSearchMetaFromAgentPayload(
  payload: Record<string, unknown> | undefined
): CarRentalSearchMeta | undefined {
  if (!payload) return undefined;

  const uiDisplay =
    payload.ui_display && typeof payload.ui_display === 'object' && !Array.isArray(payload.ui_display)
      ? (payload.ui_display as Record<string, unknown>)
      : undefined;
  const audit =
    payload.live_sensor_audit &&
    typeof payload.live_sensor_audit === 'object' &&
    !Array.isArray(payload.live_sensor_audit)
      ? (payload.live_sensor_audit as Record<string, unknown>)
      : undefined;

  const raw =
    payload.car_rental_search_meta ??
    payload.carRentalSearchMeta ??
    uiDisplay?.car_rental_search_meta ??
    uiDisplay?.carRentalSearchMeta ??
    audit?.car_rental_search_meta ??
    audit?.carRentalSearchMeta;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const m = raw as Record<string, unknown>;
  const fallback =
    m.fallback_dates_used === true ||
    m.fallbackDatesUsed === true ||
    m.fallback_dates === true;

  if (!fallback) return undefined;
  return { fallback_dates_used: true };
}

/**
 * 从 route_and_run payload 提取租车列表（与 MCP / Booking 租车结果对齐）。
 * 兼容顶层字段、ui_display、live_sensor_audit 挂载。
 */
export function extractCarRentalsFromAgentPayload(
  payload: Record<string, unknown> | undefined
): CarRentalItem[] | undefined {
  if (!payload) return undefined;

  const uiDisplay =
    payload.ui_display && typeof payload.ui_display === 'object' && !Array.isArray(payload.ui_display)
      ? (payload.ui_display as Record<string, unknown>)
      : undefined;
  const audit =
    payload.live_sensor_audit &&
    typeof payload.live_sensor_audit === 'object' &&
    !Array.isArray(payload.live_sensor_audit)
      ? (payload.live_sensor_audit as Record<string, unknown>)
      : undefined;

  const raw =
    payload.car_rentals ??
    payload.carRentals ??
    payload.rentals ??
    uiDisplay?.car_rentals ??
    uiDisplay?.carRentals ??
    uiDisplay?.rentals ??
    audit?.car_rentals ??
    audit?.carRentals ??
    audit?.rentals ??
    audit?.car_rental_results;

  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const mapped = raw.filter((item) => item && typeof item === 'object') as CarRentalItem[];
  return mapped.length > 0 ? mapped : undefined;
}
