import { isAxiosError } from 'axios';
import {
  accommodationsApi,
  type AccommodationCardSnapshot,
  type ApplyAccommodationToTripRequest,
  type ApplyAccommodationToTripResponse,
} from '@/api/planning-assistant-v2/accommodations';
import type { Accommodation } from '@/api/planning-assistant-v2/types';

export type ApplyAccommodationResult =
  | { status: 'success'; response: ApplyAccommodationToTripResponse }
  | { status: 'needs_replace'; accommodation: Accommodation; existingName?: string };

function toDateOnly(iso?: string): string | undefined {
  const trimmed = iso?.trim().slice(0, 10);
  return trimmed || undefined;
}

function resolveListingCoordinates(
  accommodation: Accommodation
): { lat: number; lng: number } | undefined {
  if (
    accommodation.listingLat != null &&
    accommodation.listingLng != null &&
    !Number.isNaN(accommodation.listingLat) &&
    !Number.isNaN(accommodation.listingLng)
  ) {
    return { lat: accommodation.listingLat, lng: accommodation.listingLng };
  }
  const lat = accommodation.location?.lat;
  const lng = accommodation.location?.lng;
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return undefined;
}

function appendListingCoordinates(
  card: AccommodationCardSnapshot,
  coords: { lat: number; lng: number } | undefined
): AccommodationCardSnapshot {
  if (!coords) return card;
  return {
    ...card,
    listing_lat: coords.lat,
    listing_lng: coords.lng,
    listingLat: coords.lat,
    listingLng: coords.lng,
    location: card.location ?? { lat: coords.lat, lng: coords.lng },
  };
}

function readListingCoordinatesFromSnapshot(
  snapshot: AccommodationCardSnapshot
): { lat: number; lng: number } | undefined {
  const latRaw =
    snapshot.listing_lat ??
    snapshot.listingLat ??
    (snapshot.location && typeof snapshot.location === 'object' && !Array.isArray(snapshot.location)
      ? (snapshot.location as { lat?: unknown }).lat
      : undefined);
  const lngRaw =
    snapshot.listing_lng ??
    snapshot.listingLng ??
    (snapshot.location && typeof snapshot.location === 'object' && !Array.isArray(snapshot.location)
      ? (snapshot.location as { lng?: unknown }).lng
      : undefined);
  const lat = typeof latRaw === 'number' ? latRaw : latRaw != null ? Number(latRaw) : NaN;
  const lng = typeof lngRaw === 'number' ? lngRaw : lngRaw != null ? Number(lngRaw) : NaN;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined;
  return { lat, lng };
}

/** 从 action.params 读取后端下发的 apply 快照 */
export function readApplySnapshotFromActionParams(
  params?: Record<string, unknown> | null
): AccommodationCardSnapshot | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const raw =
    params.applySnapshot ??
    params.apply_snapshot ??
    params.accommodationCard ??
    params.accommodation_card;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return raw as AccommodationCardSnapshot;
}

/**
 * 从列表卡片组装 apply 快照（payload.accommodations[index] 或本地兜底）。
 */
export function buildApplyAccommodationCard(
  accommodation: Accommodation,
  accommodationIndex: number,
  defaults?: { defaultCheckIn?: string; defaultCheckOut?: string }
): AccommodationCardSnapshot {
  const checkIn = toDateOnly(accommodation.checkIn) ?? toDateOnly(defaults?.defaultCheckIn);
  const checkOut = toDateOnly(accommodation.checkOut) ?? toDateOnly(defaults?.defaultCheckOut);
  const nightIndex =
    accommodation.nightIndex ??
    (Number.isFinite(accommodationIndex) ? accommodationIndex + 1 : 1);

  const priceLabel =
    accommodation.price?.trim() ||
    (typeof (accommodation as Record<string, unknown>).priceLabel === 'string'
      ? String((accommodation as Record<string, unknown>).priceLabel).trim()
      : undefined);

  const card: AccommodationCardSnapshot = {
    id: accommodation.id,
    source: accommodation.source,
    name: accommodation.name,
    ...(accommodation.nameCN ? { nameCN: accommodation.nameCN } : {}),
    ...(accommodation.nameEN ? { nameEN: accommodation.nameEN } : {}),
    ...(checkIn ? { checkIn } : {}),
    ...(checkOut ? { checkOut } : {}),
    nightIndex,
    ...(accommodation.address ? { address: accommodation.address } : {}),
    ...(accommodation.url ? { url: accommodation.url } : {}),
    ...(priceLabel ? { priceLabel } : {}),
    ...(accommodation.price ? { price: accommodation.price } : {}),
    ...(accommodation.photoUrl ? { photoUrl: accommodation.photoUrl } : {}),
    ...(accommodation.rating != null ? { rating: accommodation.rating } : {}),
    ...(accommodation.roomSpecs ? { roomSpecs: accommodation.roomSpecs } : {}),
    ...(accommodation.distanceLabelZh ? { distanceLabelZh: accommodation.distanceLabelZh } : {}),
    ...(accommodation.anchorPoiNameZh ? { anchorPoiNameZh: accommodation.anchorPoiNameZh } : {}),
    ...(accommodation.distanceToAnchorKm != null
      ? { distanceToAnchorKm: accommodation.distanceToAnchorKm }
      : {}),
  };

  return appendListingCoordinates(card, resolveListingCoordinates(accommodation));
}

export function mergeApplyAccommodationCard(
  actionSnapshot: AccommodationCardSnapshot | undefined,
  accommodation: Accommodation,
  accommodationIndex: number,
  defaults?: { defaultCheckIn?: string; defaultCheckOut?: string }
): AccommodationCardSnapshot {
  const fromItem = buildApplyAccommodationCard(accommodation, accommodationIndex, defaults);
  if (!actionSnapshot) return fromItem;

  const checkIn =
    toDateOnly(actionSnapshot.checkIn) ??
    toDateOnly(actionSnapshot.check_in) ??
    fromItem.checkIn;
  const checkOut =
    toDateOnly(actionSnapshot.checkOut) ??
    toDateOnly(actionSnapshot.check_out) ??
    fromItem.checkOut;

  return appendListingCoordinates(
    {
      ...fromItem,
      ...actionSnapshot,
      ...(checkIn ? { checkIn } : {}),
      ...(checkOut ? { checkOut } : {}),
      id: String(actionSnapshot.id ?? fromItem.id),
      source: (actionSnapshot.source ?? fromItem.source) as Accommodation['source'],
      name: String(actionSnapshot.name ?? fromItem.name),
    },
    readListingCoordinatesFromSnapshot(actionSnapshot) ?? resolveListingCoordinates(accommodation)
  );
}

export function buildApplyAccommodationToTripRequest(
  accommodation: Accommodation,
  options: {
    sessionId: string;
    accommodationIndex: number;
    replaceExisting?: boolean;
    defaultCheckIn?: string;
    defaultCheckOut?: string;
    /** add_accommodation_to_itinerary action.params.applySnapshot */
    applySnapshot?: AccommodationCardSnapshot;
  }
): ApplyAccommodationToTripRequest {
  const accommodationCard = mergeApplyAccommodationCard(
    options.applySnapshot,
    accommodation,
    options.accommodationIndex,
    {
      defaultCheckIn: options.defaultCheckIn,
      defaultCheckOut: options.defaultCheckOut,
    }
  );

  return {
    sessionId: options.sessionId.trim(),
    accommodationIndex: options.accommodationIndex,
    accommodationCard,
    ...(options.replaceExisting ? { replaceExisting: true } : {}),
  };
}

export async function applyAccommodationToTrip(
  tripId: string,
  accommodation: Accommodation,
  options: {
    replaceExisting?: boolean;
    accommodationIndex: number;
    sessionId: string;
    defaultCheckIn?: string;
    defaultCheckOut?: string;
    applySnapshot?: AccommodationCardSnapshot;
  }
): Promise<ApplyAccommodationResult> {
  if (!options.sessionId?.trim()) {
    throw new Error('缺少规划助手 sessionId');
  }

  const body = buildApplyAccommodationToTripRequest(accommodation, options);
  const checkIn = toDateOnly(body.accommodationCard.checkIn) ?? toDateOnly(body.accommodationCard.check_in);
  if (!checkIn) {
    throw new Error('缺少入住日期，请确认行程日期或重新检索住宿');
  }

  try {
    const response = await accommodationsApi.applyToTrip(tripId, body);
    if (response.needsReplaceConfirm) {
      return {
        status: 'needs_replace',
        accommodation,
        existingName:
          response.existingItem?.nameCN ||
          response.existingItem?.name ||
          undefined,
      };
    }
    return { status: 'success', response };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 409) {
      const data = err.response.data as ApplyAccommodationToTripResponse | undefined;
      return {
        status: 'needs_replace',
        accommodation,
        existingName:
          data?.existingItem?.nameCN ||
          data?.existingItem?.name ||
          undefined,
      };
    }
    throw err;
  }
}

/** 规划工作台：刷新时间轴（与 AgentChatSidebar / plan-studio 监听一致） */
export function refreshPlanStudioSchedule(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
  }
}
