import type { ItineraryItem, Place } from '@/types/trip';

type PlaceDisplayLike = Pick<Place, 'displayName' | 'nameCN' | 'nameEN'> & {
  display_name?: string | null;
  name_cn?: string | null;
  name_en?: string | null;
};

function pickTrimmed(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Place 展示名：优先 Place 库 `nameCN`，再 BFF `displayName`，最后 `nameEN` */
export function resolvePlaceDisplayName(
  place: PlaceDisplayLike | null | undefined,
): string | undefined {
  return (
    pickTrimmed(place?.nameCN, place?.name_cn, place?.displayName, place?.display_name, place?.nameEN, place?.name_en) ||
    undefined
  );
}

/** 行程项 POI 展示名：Place.nameCN → item.placeName → Place.displayName → Place.nameEN */
export function resolveItineraryItemPlaceDisplayName(
  item: Pick<ItineraryItem, 'Place'> & { placeName?: string | null },
): string | undefined {
  const fromPlace = resolvePlaceDisplayName(item.Place ?? undefined);
  if (fromPlace) return fromPlace;
  return item.placeName?.trim() || undefined;
}
