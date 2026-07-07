import { collectPlaceImages } from '@/lib/collect-place-images';
import type { PlaceImageInfo } from '@/types/place-image';
import type { ItineraryItem, TripDetail, TripListItem } from '@/types/trip';

export type TripCoverImageSource = 'auto' | 'poi' | 'user';

export interface TripCoverConfig {
  coverImageUrl?: string | null;
  coverImageSource?: TripCoverImageSource | null;
  coverPlaceId?: number | null;
}

export interface TripCoverCandidate {
  placeId: number;
  placeName: string;
  imageUrl: string;
}

function readMeta(trip: TripListItem | TripDetail): Record<string, unknown> {
  return (trip.metadata as Record<string, unknown> | undefined) ?? {};
}

export function readTripCoverConfig(trip: TripListItem | TripDetail): TripCoverConfig {
  const meta = readMeta(trip);
  const source = meta.coverImageSource;
  const coverImageSource =
    source === 'auto' || source === 'poi' || source === 'user' ? source : undefined;

  const coverPlaceId =
    typeof meta.coverPlaceId === 'number' && Number.isFinite(meta.coverPlaceId)
      ? meta.coverPlaceId
      : null;

  const coverImageUrl =
    typeof meta.coverImageUrl === 'string' && meta.coverImageUrl.trim()
      ? meta.coverImageUrl.trim()
      : typeof meta.coverImage === 'string' && meta.coverImage.trim()
        ? meta.coverImage.trim()
        : null;

  return { coverImageUrl, coverImageSource, coverPlaceId };
}

export function buildTripCoverMetadataPatch(
  existingMetadata: Record<string, unknown> | undefined,
  config: TripCoverConfig,
): Record<string, unknown> {
  const next = { ...(existingMetadata ?? {}) };

  if (config.coverImageSource) {
    next.coverImageSource = config.coverImageSource;
  } else {
    delete next.coverImageSource;
  }

  if (config.coverPlaceId != null) {
    next.coverPlaceId = config.coverPlaceId;
  } else {
    delete next.coverPlaceId;
  }

  if (config.coverImageUrl) {
    next.coverImageUrl = config.coverImageUrl;
    next.coverImage = config.coverImageUrl;
  } else {
    delete next.coverImageUrl;
    delete next.coverImage;
  }

  return next;
}

/** 稳定 hash（Java 风格 unsigned），与后端 cover-image.util.ts 一致 */
export function hashTripId(tripId: string): number {
  let hash = 0;
  for (let i = 0; i < tripId.length; i += 1) {
    hash = (hash * 31 + tripId.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function pickDeterministicCoverCandidate(
  tripId: string,
  candidates: TripCoverCandidate[],
): TripCoverCandidate | undefined {
  if (!candidates.length) return undefined;
  return candidates[hashTripId(tripId) % candidates.length];
}

export function resolveActivityCoverImageUrl(
  item: ItineraryItem,
  placeImagesMap: Map<number, PlaceImageInfo[]>,
): string | undefined {
  const placeImages = item.Place?.id ? placeImagesMap.get(item.Place.id) : undefined;
  return collectPlaceImages({ placeImages, place: item.Place ?? null })[0]?.url;
}

export function buildTripCoverCandidates(input: {
  trip: TripDetail;
  placeImagesMap: Map<number, PlaceImageInfo[]>;
  resolvePlaceName: (item: ItineraryItem) => string;
}): TripCoverCandidate[] {
  const seenPlaceIds = new Set<number>();
  const candidates: TripCoverCandidate[] = [];

  for (const day of input.trip.TripDay ?? []) {
    for (const item of day.ItineraryItem ?? []) {
      const placeId = item.Place?.id;
      if (!placeId || seenPlaceIds.has(placeId)) continue;

      const imageUrl = resolveActivityCoverImageUrl(item, input.placeImagesMap);
      if (!imageUrl) continue;

      seenPlaceIds.add(placeId);
      candidates.push({
        placeId,
        placeName: input.resolvePlaceName(item) || `地点 ${placeId}`,
        imageUrl,
      });
    }
  }

  return candidates;
}

export function resolveAutoCoverPreviewUrl(
  tripId: string,
  candidates: TripCoverCandidate[],
): string | undefined {
  // 仅用于封面配置弹窗预览；列表展示以 BFF listSummary.coverImageUrl 为准
  return pickDeterministicCoverCandidate(tripId, candidates)?.imageUrl;
}
