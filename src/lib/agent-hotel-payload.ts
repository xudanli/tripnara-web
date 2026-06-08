import type { Hotel } from '@/api/planning-assistant-v2';

/**
 * 从 route_and_run 的 payload 中提取酒店列表（与 Planning Assistant V2 / MCP 酒店卡片字段对齐）。
 * 兼容顶层 hotels、ui_display、live_sensor_audit 等挂载方式。
 */
export function extractHotelsFromAgentPayload(
  payload: Record<string, unknown> | undefined
): Hotel[] | undefined {
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
    payload.hotels ??
    uiDisplay?.hotels ??
    audit?.hotels ??
    audit?.hotel_results ??
    (audit?.result && typeof audit.result === 'object' && !Array.isArray(audit.result)
      ? (audit.result as Record<string, unknown>).hotels
      : undefined);

  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const mapped = raw.map((item, idx) => normalizeHotelRecord(item, idx)).filter(Boolean) as Hotel[];
  return mapped.length > 0 ? mapped : undefined;
}

function normalizeHotelRecord(item: unknown, idx: number): Hotel | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;

  const placeId = String(o.placeId ?? o.place_id ?? o.id ?? `hotel-${idx}`);
  const name = String(o.name ?? o.title ?? '酒店');
  const address = String(o.address ?? o.formatted_address ?? '');

  const locRaw = o.location ?? o.geometry;
  let lat = 0;
  let lng = 0;
  if (locRaw && typeof locRaw === 'object' && !Array.isArray(locRaw)) {
    const L = locRaw as Record<string, unknown>;
    const nested =
      L.location && typeof L.location === 'object'
        ? (L.location as Record<string, unknown>)
        : L;
    lat = Number(nested.lat ?? nested.latitude ?? 0);
    lng = Number(nested.lng ?? nested.longitude ?? 0);
  }

  const rating =
    typeof o.rating === 'number' && !Number.isNaN(o.rating)
      ? o.rating
      : Number(o.rating) || 0;
  const userRatingsTotal =
    typeof o.userRatingsTotal === 'number'
      ? o.userRatingsTotal
      : typeof o.user_ratings_total === 'number'
        ? o.user_ratings_total
        : 0;

  const types = Array.isArray(o.types) ? o.types.map((x) => String(x)) : [];

  const priceLevel =
    typeof o.priceLevel === 'number'
      ? o.priceLevel
      : typeof o.price_level === 'number'
        ? o.price_level
        : undefined;

  const phone =
    typeof o.phoneNumber === 'string'
      ? o.phoneNumber
      : typeof o.phone_number === 'string'
        ? o.phone_number
        : undefined;
  const website = typeof o.website === 'string' ? o.website : undefined;
  const amenities = Array.isArray(o.amenities) ? o.amenities.map((x) => String(x)) : undefined;

  const hotel: Hotel = {
    placeId,
    name,
    address,
    location: { lat, lng },
    rating,
    userRatingsTotal,
    types,
    ...(typeof priceLevel === 'number' && priceLevel >= 1 && priceLevel <= 4 ? { priceLevel } : {}),
    ...(phone ? { phoneNumber: phone } : {}),
    ...(website ? { website } : {}),
    ...(amenities && amenities.length > 0 ? { amenities } : {}),
  };

  return hotel;
}
