import type { Accommodation } from '@/api/planning-assistant-v2';

/**
 * 从 `accommodation_night_groups[].cards` 等结构扁平化出与 `accommodations` 同形的卡片列表。
 */
function flattenAccommodationNightGroupCards(
  payload: Record<string, unknown>
): unknown[] | undefined {
  const groups =
    payload.accommodation_night_groups ??
    payload.accommodationNightGroups ??
    payload.night_groups ??
    payload.nightGroups;
  if (!Array.isArray(groups) || groups.length === 0) return undefined;
  const out: unknown[] = [];
  for (const g of groups) {
    if (!g || typeof g !== 'object' || Array.isArray(g)) continue;
    const rec = g as Record<string, unknown>;
    const cards = rec.cards ?? rec.accommodations;
    if (Array.isArray(cards)) out.push(...cards);
  }
  return out.length ? out : undefined;
}

/**
 * 从 route_and_run 成功体的 payload（及必要时顶层 result）解析住宿列表，
 * 与 Planning Assistant V2 / MCP `AccommodationList` 字段对齐。
 * 兼容 snake_case、priceLabel、photo_url 等与 WebSocket 侧可能不一致的命名。
 */
export function extractAccommodationsFromAgentPayload(
  root: Record<string, unknown> | undefined
): Accommodation[] | undefined {
  if (!root) return undefined;

  const payload =
    root.payload && typeof root.payload === 'object' && !Array.isArray(root.payload)
      ? (root.payload as Record<string, unknown>)
      : undefined;

  const uiDisplay =
    root.ui_display && typeof root.ui_display === 'object' && !Array.isArray(root.ui_display)
      ? (root.ui_display as Record<string, unknown>)
      : payload?.ui_display &&
          typeof payload.ui_display === 'object' &&
          !Array.isArray(payload.ui_display)
        ? (payload.ui_display as Record<string, unknown>)
        : undefined;

  const auditRaw = root.live_sensor_audit ?? payload?.live_sensor_audit;
  const audit =
    auditRaw && typeof auditRaw === 'object' && !Array.isArray(auditRaw)
      ? (auditRaw as Record<string, unknown>)
      : undefined;

  let raw =
    root.accommodations ??
    payload?.accommodations ??
    uiDisplay?.accommodations ??
    audit?.accommodations ??
    (audit?.result && typeof audit.result === 'object' && !Array.isArray(audit.result)
      ? (audit.result as Record<string, unknown>).accommodations
      : undefined);

  if ((!Array.isArray(raw) || raw.length === 0) && payload && typeof payload === 'object') {
    raw = flattenAccommodationNightGroupCards(payload as Record<string, unknown>);
  }

  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const mapped = raw.map((item, idx) => normalizeAccommodation(item, idx)).filter(Boolean) as Accommodation[];
  return mapped.length > 0 ? mapped : undefined;
}

/** 仅解析 payload 对象（不含外层 result 包装） */
export function extractAccommodationsFromPayloadOnly(
  payload: Record<string, unknown> | undefined
): Accommodation[] | undefined {
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

  let raw =
    payload.accommodations ??
    uiDisplay?.accommodations ??
    audit?.accommodations ??
    (audit?.result && typeof audit.result === 'object' && !Array.isArray(audit.result)
      ? (audit.result as Record<string, unknown>).accommodations
      : undefined);

  if ((!Array.isArray(raw) || raw.length === 0) && payload) {
    raw = flattenAccommodationNightGroupCards(payload);
  }

  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const mapped = raw.map((item, idx) => normalizeAccommodation(item, idx)).filter(Boolean) as Accommodation[];
  return mapped.length > 0 ? mapped : undefined;
}

export function extractAccommodationsFromRouteRunSuccess(
  payloadRecord: Record<string, unknown> | undefined,
  resultRecord: Record<string, unknown> | undefined
): Accommodation[] | undefined {
  return (
    extractAccommodationsFromPayloadOnly(payloadRecord) ??
    extractAccommodationsFromAgentPayload(resultRecord)
  );
}

/** payload / result 顶层的 hotel_search_meta.disclaimer_zh（与条目级字段并存时优先用组件 props） */
export function extractHotelSearchDisclaimerZh(
  payloadRecord: Record<string, unknown> | undefined,
  resultRecord: Record<string, unknown> | undefined
): string | undefined {
  const pick = (root: Record<string, unknown> | undefined) => {
    const meta = root?.hotel_search_meta ?? root?.hotelSearchMeta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
    const m = meta as Record<string, unknown>;
    const d = m.disclaimer_zh ?? m.disclaimerZh;
    return typeof d === 'string' ? d.trim() || undefined : undefined;
  };
  return pick(payloadRecord) ?? pick(resultRecord);
}

function inferSource(o: Record<string, unknown>): 'hotel' | 'airbnb' {
  const s = String(o.source ?? o.provider ?? o.kind ?? '').toLowerCase();
  if (s === 'airbnb' || s === 'abnb' || s === 'bnb') return 'airbnb';
  if (s === 'hotel' || s === 'lodging') return 'hotel';
  const types = Array.isArray(o.types) ? o.types.map((x) => String(x).toLowerCase()) : [];
  if (types.some((t) => t.includes('airbnb'))) return 'airbnb';
  return 'hotel';
}

function normalizeAccommodation(item: unknown, idx: number): Accommodation | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;

  const id = String(o.id ?? o.place_id ?? o.placeId ?? `acc-${idx}`);
  const source = inferSource(o);

  const name = String(o.name ?? o.title ?? o.name_cn ?? o.nameCN ?? '住宿');
  const nameCN =
    typeof o.nameCN === 'string'
      ? o.nameCN
      : typeof o.name_cn === 'string'
        ? o.name_cn
        : undefined;
  const nameEN =
    typeof o.nameEN === 'string'
      ? o.nameEN
      : typeof o.name_en === 'string'
        ? o.name_en
        : undefined;

  const address =
    typeof o.address === 'string'
      ? o.address
      : typeof o.formatted_address === 'string'
        ? o.formatted_address
        : undefined;

  const roomSpecs =
    typeof o.roomSpecs === 'string'
      ? o.roomSpecs
      : typeof o.room_specs === 'string'
        ? o.room_specs
        : undefined;

  const priceRaw =
    o.price ?? o.priceLabel ?? o.price_label ?? o.price_text ?? o.display_price;
  const price =
    typeof priceRaw === 'string'
      ? priceRaw
      : priceRaw != null && String(priceRaw).trim()
        ? String(priceRaw)
        : undefined;

  const photos = Array.isArray(o.photos) ? o.photos.map((x) => String(x)) : undefined;
  const photoUrl =
    typeof o.photoUrl === 'string'
      ? o.photoUrl
      : typeof o.photo_url === 'string'
        ? o.photo_url
        : typeof o.image === 'string'
          ? o.image
          : typeof o.thumbnail === 'string'
            ? o.thumbnail
            : photos?.[0];

  const url =
    typeof o.url === 'string'
      ? o.url
      : typeof o.link === 'string'
        ? o.link
        : typeof o.booking_url === 'string'
          ? o.booking_url
          : undefined;

  const rating =
    typeof o.rating === 'number' && !Number.isNaN(o.rating)
      ? o.rating
      : o.rating != null
        ? Number(o.rating)
        : undefined;
  const ratingOk = rating != null && !Number.isNaN(rating) ? rating : undefined;

  const ratingCount =
    typeof o.ratingCount === 'number'
      ? o.ratingCount
      : typeof o.rating_count === 'number'
        ? o.rating_count
        : typeof o.user_ratings_total === 'number'
          ? o.user_ratings_total
          : undefined;

  const pl = o.priceLevel ?? o.price_level;
  let priceLevel: 1 | 2 | 3 | 4 | undefined;
  if (typeof pl === 'number' && pl >= 1 && pl <= 4 && Number.isInteger(pl)) {
    priceLevel = pl as 1 | 2 | 3 | 4;
  }

  const listingLatRaw = o.listingLat ?? o.listing_lat;
  const listingLngRaw = o.listingLng ?? o.listing_lng;
  const listingLat =
    typeof listingLatRaw === 'number' && !Number.isNaN(listingLatRaw)
      ? listingLatRaw
      : listingLatRaw != null
        ? Number(listingLatRaw)
        : undefined;
  const listingLng =
    typeof listingLngRaw === 'number' && !Number.isNaN(listingLngRaw)
      ? listingLngRaw
      : listingLngRaw != null
        ? Number(listingLngRaw)
        : undefined;
  const listingLatOk =
    listingLat != null && !Number.isNaN(listingLat) ? listingLat : undefined;
  const listingLngOk =
    listingLng != null && !Number.isNaN(listingLng) ? listingLng : undefined;

  const locRaw = o.location ?? o.geometry;
  let location: { lat: number; lng: number } | undefined;
  if (listingLatOk != null && listingLngOk != null) {
    location = { lat: listingLatOk, lng: listingLngOk };
  } else if (locRaw && typeof locRaw === 'object' && !Array.isArray(locRaw)) {
    const L = locRaw as Record<string, unknown>;
    const nested =
      L.location && typeof L.location === 'object' ? (L.location as Record<string, unknown>) : L;
    const lat = Number(nested.lat ?? nested.latitude);
    const lng = Number(nested.lng ?? nested.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      location = { lat, lng };
    }
  }

  const distanceKm =
    typeof o.distanceKm === 'number'
      ? o.distanceKm
      : typeof o.distance_km === 'number'
        ? o.distance_km
        : undefined;
  const nearestPlaceName =
    typeof o.nearestPlaceName === 'string'
      ? o.nearestPlaceName
      : typeof o.nearest_place_name === 'string'
        ? o.nearest_place_name
        : undefined;

  const distanceToAnchorKmRaw =
    o.distanceToAnchorKm ?? o.distance_to_anchor_km ?? o.anchor_distance_km;
  const distanceToAnchorKm =
    typeof distanceToAnchorKmRaw === 'number' && !Number.isNaN(distanceToAnchorKmRaw)
      ? distanceToAnchorKmRaw
      : distanceToAnchorKmRaw != null
        ? Number(distanceToAnchorKmRaw)
        : undefined;
  const distanceToAnchorKmOk =
    distanceToAnchorKm != null && !Number.isNaN(distanceToAnchorKm) ? distanceToAnchorKm : undefined;

  const anchorPoiNameZh =
    typeof o.anchorPoiNameZh === 'string'
      ? o.anchorPoiNameZh
      : typeof o.anchor_poi_name_zh === 'string'
        ? o.anchor_poi_name_zh
        : undefined;

  const distanceLabelZh =
    typeof o.distanceLabelZh === 'string'
      ? o.distanceLabelZh.trim() || undefined
      : typeof o.distance_label_zh === 'string'
        ? o.distance_label_zh.trim() || undefined
        : undefined;

  const decisionSupportZh =
    typeof o.decisionSupportZh === 'string'
      ? o.decisionSupportZh.trim() || undefined
      : typeof o.decision_support_zh === 'string'
        ? o.decision_support_zh.trim() || undefined
        : undefined;

  const checkIn =
    typeof o.checkIn === 'string'
      ? o.checkIn
      : typeof o.check_in === 'string'
        ? o.check_in
        : undefined;
  const checkOut =
    typeof o.checkOut === 'string'
      ? o.checkOut
      : typeof o.check_out === 'string'
        ? o.check_out
        : undefined;

  const nightIndexRaw = o.nightIndex ?? o.night_index;
  const nightIndexParsed =
    typeof nightIndexRaw === 'number' && Number.isFinite(nightIndexRaw)
      ? nightIndexRaw
      : typeof nightIndexRaw === 'string' && nightIndexRaw.trim()
        ? Number(nightIndexRaw)
        : undefined;
  const nightIndex =
    nightIndexParsed != null && !Number.isNaN(nightIndexParsed) ? nightIndexParsed : idx + 1;

  const itineraryHintZh = normalizeItineraryHintZh(o.itinerary_hint_zh ?? o.itineraryHintZh);

  const stayLabelZhRaw =
    typeof o.stayLabelZh === 'string'
      ? o.stayLabelZh
      : typeof o.stay_label_zh === 'string'
        ? o.stay_label_zh
        : undefined;
  const stayLabelZh = stayLabelZhRaw?.trim() || undefined;

  const metaRaw = o.hotel_search_meta ?? o.hotelSearchMeta;
  let hotelSearchMeta: Accommodation['hotelSearchMeta'] | undefined;
  if (metaRaw && typeof metaRaw === 'object' && !Array.isArray(metaRaw)) {
    const m = metaRaw as Record<string, unknown>;
    const disclaimer_zh =
      typeof m.disclaimer_zh === 'string'
        ? m.disclaimer_zh
        : typeof m.disclaimerZh === 'string'
          ? m.disclaimerZh
          : undefined;
    hotelSearchMeta = {
      ...m,
      ...(disclaimer_zh ? { disclaimer_zh } : {}),
    };
  }

  const actions = normalizeAccommodationActions(o.actions);

  const acc: Accommodation = {
    id,
    source,
    name,
    ...(nameCN ? { nameCN } : {}),
    ...(nameEN ? { nameEN } : {}),
    ...(address ? { address } : {}),
    ...(roomSpecs ? { roomSpecs } : {}),
    ...(location ? { location } : {}),
    ...(ratingOk != null ? { rating: ratingOk } : {}),
    ...(ratingCount != null ? { ratingCount } : {}),
    ...(price ? { price } : {}),
    ...(priceLevel ? { priceLevel } : {}),
    ...(url ? { url } : {}),
    ...(photoUrl ? { photoUrl } : {}),
    ...(photos && photos.length > 0 ? { photos } : {}),
    ...(checkIn ? { checkIn } : {}),
    ...(checkOut ? { checkOut } : {}),
    nightIndex,
    ...(distanceKm != null ? { distanceKm } : {}),
    ...(nearestPlaceName ? { nearestPlaceName } : {}),
    ...(distanceToAnchorKmOk != null ? { distanceToAnchorKm: distanceToAnchorKmOk } : {}),
    ...(anchorPoiNameZh ? { anchorPoiNameZh } : {}),
    ...(distanceLabelZh ? { distanceLabelZh } : {}),
    ...(decisionSupportZh ? { decisionSupportZh } : {}),
    ...(listingLatOk != null ? { listingLat: listingLatOk } : {}),
    ...(listingLngOk != null ? { listingLng: listingLngOk } : {}),
    ...(itineraryHintZh ? { itineraryHintZh } : {}),
    ...(stayLabelZh ? { stayLabelZh } : {}),
    ...(hotelSearchMeta ? { hotelSearchMeta } : {}),
    ...(actions?.length ? { actions } : {}),
  };

  return acc;
}

/** planning-assistant/v2/chat 或 route_and_run 下发的 accommodations[]：snake_case → Accommodation（保序） */
export function normalizeAccommodationsList(
  raw: unknown[] | undefined | null
): Accommodation[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const mapped = raw.map((item, idx) => normalizeAccommodation(item, idx)).filter(Boolean) as Accommodation[];
  return mapped.length > 0 ? mapped : undefined;
}

function normalizeAccommodationActions(raw: unknown): Accommodation['actions'] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: NonNullable<Accommodation['actions']> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const o = entry as Record<string, unknown>;
    const action = String(o.action ?? '').trim();
    const label = String(o.label ?? '').trim();
    if (!action || !label) continue;
    const labelCN = typeof o.labelCN === 'string' ? o.labelCN : typeof o.label_cn === 'string' ? o.label_cn : undefined;
    const params =
      o.params && typeof o.params === 'object' && !Array.isArray(o.params)
        ? (o.params as Record<string, unknown>)
        : undefined;
    out.push({ action, label, ...(labelCN ? { labelCN } : {}), ...(params ? { params } : {}) });
  }
  return out.length ? out : undefined;
}

function normalizeItineraryHintZh(raw: unknown): Accommodation['itineraryHintZh'] | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t || undefined;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Accommodation['itineraryHintZh'];
  }
  return undefined;
}
