import type {
  ArrangeLodgingSuggestion,
  ArrangeLodgingSuggestionCandidate,
  ArrangeLodgingWorkbenchItem,
  ArrangeLodgingWorkbenchKind,
  ArrangeLodgingWorkbenchPriority,
} from '@/types/arrange-itinerary';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeWorkbenchKind(value: unknown): ArrangeLodgingWorkbenchKind | undefined {
  const raw = asString(value);
  return raw === 'current' || raw === 'alternative' || raw === 'recommended' ? raw : undefined;
}

function normalizeWorkbenchPriority(value: unknown): ArrangeLodgingWorkbenchPriority | undefined {
  const raw = asString(value);
  return raw === 'primary' || raw === 'alternative' || raw === 'recommended' ? raw : undefined;
}

function normalizeLodgingCandidate(raw: unknown): ArrangeLodgingSuggestionCandidate | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id ?? record.candidateId ?? record.candidate_id);
  const name = asString(record.name ?? record.label);
  if (!id || !name) return null;
  const coords = readRecord(record.coordinates);
  const applyRaw = record.applySnapshot ?? record.apply_snapshot;
  const meta = readRecord(record.meta);
  return {
    id,
    name,
    placeId: record.placeId ?? record.place_id ?? undefined,
    lat: asNumber(record.lat ?? record.latitude ?? coords?.lat ?? coords?.latitude),
    lng: asNumber(record.lng ?? record.longitude ?? record.lon ?? coords?.lng ?? coords?.longitude ?? coords?.lon),
    stars: asNumber(record.stars ?? record.starRating ?? record.star_rating),
    priceTierLabel: asString(record.priceTierLabel ?? record.price_tier_label ?? record.priceTier),
    nextDayDriveMinutesDelta: asNumber(
      record.nextDayDriveMinutesDelta ?? record.next_day_drive_minutes_delta,
    ),
    nextDayDriveMinutes: asNumber(
      record.nextDayDriveMinutes ??
        record.next_day_drive_minutes ??
        record.driveMinutesEstimate ??
        record.drive_minutes_estimate ??
        meta?.driveMinutesEstimate ??
        meta?.drive_minutes_estimate,
    ),
    matchScore: asNumber(record.matchScore ?? record.match_score),
    url: asString(record.url),
    applySnapshot: readRecord(applyRaw) ?? undefined,
    recommended:
      record.recommended === true ||
      asString(record.priority) === 'primary' ||
      (normalizeWorkbenchKind(record.kind) === 'recommended' &&
        asString(record.priority) !== 'alternative'),
    kind: normalizeWorkbenchKind(record.kind),
    priority: normalizeWorkbenchPriority(record.priority),
    reason: asString(record.reason ?? record.recommendationReason ?? record.recommendation_reason),
    distanceFromAnchorKm: asNumber(
      record.distanceFromAnchorKm ??
        record.distance_from_anchor_km ??
        meta?.distanceFromAnchorKm ??
        meta?.distance_from_anchor_km,
    ),
    anchorPlaceName: asString(
      record.anchorPlaceName ?? record.anchor_place_name ?? meta?.anchorPlaceName ?? meta?.anchor_place_name,
    ),
    driveMinutesEstimate: asNumber(
      record.driveMinutesEstimate ??
        record.drive_minutes_estimate ??
        meta?.driveMinutesEstimate ??
        meta?.drive_minutes_estimate,
    ),
  };
}

export function normalizeLodgingWorkbenchItem(raw: unknown): ArrangeLodgingWorkbenchItem | null {
  const record = readRecord(raw);
  if (!record) return null;
  const id = asString(record.id);
  const name = asString(record.name ?? record.label);
  const nightIndex = asNumber(record.nightIndex ?? record.night_index);
  const dayIndex = asNumber(record.dayIndex ?? record.day_index) ?? nightIndex;
  const kind = normalizeWorkbenchKind(record.kind);
  if (!id || !name || dayIndex == null || dayIndex < 1 || !kind) return null;

  const coords = readRecord(record.coordinates);
  const metaRaw = readRecord(record.meta);

  return {
    id,
    nightIndex: nightIndex ?? dayIndex,
    dayIndex,
    placeId: record.placeId ?? record.place_id ?? undefined,
    name,
    kind,
    priority: normalizeWorkbenchPriority(record.priority),
    coordinates:
      coords &&
      asNumber(coords.lat ?? coords.latitude) != null &&
      asNumber(coords.lng ?? coords.longitude ?? coords.lon) != null
        ? {
            lat: asNumber(coords.lat ?? coords.latitude)!,
            lng: asNumber(coords.lng ?? coords.longitude ?? coords.lon)!,
          }
        : undefined,
    reason: asString(record.reason),
    meta: metaRaw
      ? {
          distanceFromAnchorKm: asNumber(
            metaRaw.distanceFromAnchorKm ?? metaRaw.distance_from_anchor_km,
          ),
          anchorPlaceName: asString(metaRaw.anchorPlaceName ?? metaRaw.anchor_place_name),
          driveMinutesEstimate: asNumber(
            metaRaw.driveMinutesEstimate ?? metaRaw.drive_minutes_estimate,
          ),
        }
      : undefined,
  };
}

function workbenchItemToCandidate(item: ArrangeLodgingWorkbenchItem): ArrangeLodgingSuggestionCandidate {
  return {
    id: item.id,
    name: item.name,
    placeId: item.placeId,
    lat: item.coordinates?.lat,
    lng: item.coordinates?.lng,
    recommended:
      item.priority === 'primary' ||
      (item.kind === 'recommended' && item.priority !== 'alternative'),
    kind: item.kind,
    priority: item.priority,
    reason: item.reason,
    distanceFromAnchorKm: item.meta?.distanceFromAnchorKm,
    anchorPlaceName: item.meta?.anchorPlaceName,
    driveMinutesEstimate: item.meta?.driveMinutesEstimate,
    nextDayDriveMinutes: item.meta?.driveMinutesEstimate,
  };
}

export function groupLodgingWorkbenchItems(
  items: ArrangeLodgingWorkbenchItem[],
): ArrangeLodgingSuggestion[] {
  const byNight = new Map<number, ArrangeLodgingWorkbenchItem[]>();
  for (const item of items) {
    const nightKey = item.nightIndex ?? item.dayIndex;
    const list = byNight.get(nightKey) ?? [];
    list.push(item);
    byNight.set(nightKey, list);
  }

  const nights: ArrangeLodgingSuggestion[] = [];
  for (const [nightKey, nightItems] of byNight) {
    const current = nightItems.find((item) => item.kind === 'current');
    const others = nightItems.filter((item) => item.kind !== 'current');
    const candidates = others.map(workbenchItemToCandidate);

    let status: ArrangeLodgingSuggestion['status'];
    if (current) status = 'booked';
    else if (candidates.length > 0) status = 'suggested';
    else status = 'missing';

    const primaryReason =
      candidates.find((item) => item.recommended)?.reason ?? candidates[0]?.reason;

    nights.push({
      dayIndex: nightKey,
      dayNumber: nightKey,
      status,
      currentLabel: current?.name,
      currentItemId: current?.id,
      candidates,
      recommendationReason: primaryReason,
    });
  }

  return nights.sort((a, b) => a.dayIndex - b.dayIndex);
}

function isFlatWorkbenchPayload(listRaw: unknown[]): boolean {
  const first = readRecord(listRaw[0]);
  if (!first) return false;
  if (Array.isArray(first.candidates)) return false;
  return (
    normalizeWorkbenchKind(first.kind) != null &&
    asString(first.name ?? first.label) != null &&
    asNumber(first.dayIndex ?? first.day_index ?? first.nightIndex ?? first.night_index) != null
  );
}

export function normalizeArrangeLodgingSuggestion(raw: unknown): ArrangeLodgingSuggestion | null {
  const record = readRecord(raw);
  if (!record) return null;
  const dayIndex = asNumber(record.dayIndex ?? record.day_index);
  if (dayIndex == null || dayIndex < 1) return null;

  const statusRaw = asString(record.status);
  const status =
    statusRaw === 'booked' || statusRaw === 'suggested' || statusRaw === 'missing'
      ? statusRaw
      : 'missing';

  const candidatesRaw = Array.isArray(record.candidates) ? record.candidates : [];
  const candidates = candidatesRaw
    .map((item) => normalizeLodgingCandidate(item))
    .filter(Boolean) as ArrangeLodgingSuggestionCandidate[];

  return {
    dayIndex,
    dayNumber: asNumber(record.dayNumber ?? record.day_number) ?? dayIndex,
    dateLabel: asString(record.dateLabel ?? record.date_label),
    status,
    currentLabel: asString(record.currentLabel ?? record.current_label),
    currentItemId: asString(record.currentItemId ?? record.current_item_id),
    candidates,
    recommendationReason: asString(record.recommendationReason ?? record.recommendation_reason),
    accommodationStandardHint: asString(
      record.accommodationStandardHint ?? record.accommodation_standard_hint,
    ),
  };
}

export function normalizeArrangeLodgingSuggestions(
  data: unknown,
): ArrangeLodgingSuggestion[] {
  const record = readRecord(data);
  const listRaw = Array.isArray(data)
    ? data
    : Array.isArray(record?.lodgingSuggestions)
      ? record!.lodgingSuggestions
      : Array.isArray(record?.lodging_suggestions)
        ? record!.lodging_suggestions
        : [];

  if (listRaw.length === 0) return [];

  if (isFlatWorkbenchPayload(listRaw)) {
    const items = listRaw
      .map((item) => normalizeLodgingWorkbenchItem(item))
      .filter(Boolean) as ArrangeLodgingWorkbenchItem[];
    return groupLodgingWorkbenchItems(items);
  }

  return listRaw
    .map((item) => normalizeArrangeLodgingSuggestion(item))
    .filter(Boolean) as ArrangeLodgingSuggestion[];
}

export function readLodgingStandardFromRecord(
  record: Record<string, unknown> | null | undefined,
): { stars?: number; label?: string } {
  if (!record) return {};
  const stars = asNumber(
    record.accommodationStandardStars ??
      record.accommodation_standard_stars ??
      record.accommodationStandard ??
      record.accommodation_standard,
  );
  const label = asString(
    record.accommodationStandardLabel ?? record.accommodation_standard_label,
  );
  if (label) return { stars, label };
  if (stars != null) return { stars, label: `${stars} 星或以上` };
  return { stars, label: undefined };
}
