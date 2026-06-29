import type { ItineraryItem, Place } from '@/types/trip';

type PlaceDisplayLike = Pick<Place, 'displayName'> & {
  display_name?: string | null;
};

/** Place 展示名（BFF `displayName`；不用 nameEN） */
export function resolvePlaceDisplayName(
  place: PlaceDisplayLike | null | undefined,
): string | undefined {
  const name = place?.displayName?.trim() || place?.display_name?.trim();
  return name || undefined;
}

/** 行程项 POI 展示名：item.placeName → Place.displayName */
export function resolveItineraryItemPlaceDisplayName(
  item: Pick<ItineraryItem, 'Place'> & { placeName?: string | null },
): string | undefined {
  const topLevel = item.placeName?.trim();
  if (topLevel) return topLevel;
  return resolvePlaceDisplayName(item.Place ?? undefined);
}
