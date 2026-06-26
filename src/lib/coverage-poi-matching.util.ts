import type { CoverageMapPoi } from '@/api/readiness';
import type { ItineraryItemDetail, Place, TripDay } from '@/types/trip';

function placeHasCoordinates(place: Place): boolean {
  const metadata = place.metadata ?? {};
  if (typeof metadata.lat === 'number' && typeof metadata.lng === 'number') return true;
  const coords = metadata.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) return true;
  if (typeof place.latitude === 'number' && typeof place.longitude === 'number') return true;
  if (typeof place.lat === 'number' && typeof place.lng === 'number') return true;
  return false;
}

function placeDisplayName(place: Place): string {
  return (place.nameCN?.trim() || place.nameEN?.trim() || '').trim();
}

/** 与后端 CoverageMapService 一致的 day+order 索引（仅有坐标 POI） */
export function buildCoveragePoiItemIndex(
  tripDays: TripDay[],
  items: ItineraryItemDetail[],
): Map<string, ItineraryItemDetail> {
  const byDayId = new Map<string, ItineraryItemDetail[]>();
  for (const item of items) {
    const dayId = item.tripDayId ?? item.TripDay?.id;
    if (!dayId) continue;
    const list = byDayId.get(dayId) ?? [];
    list.push(item);
    byDayId.set(dayId, list);
  }

  const index = new Map<string, ItineraryItemDetail>();

  tripDays.forEach((day, dayIndex) => {
    const dayNum = dayIndex + 1;
    const dayItems = byDayId.get(day.id) ?? [];
    let order = 0;

    for (const item of dayItems) {
      if (!item.Place || !placeHasCoordinates(item.Place)) continue;
      order += 1;
      index.set(`${dayNum}:${order}`, item);
      const name = placeDisplayName(item.Place);
      if (name) {
        index.set(`${dayNum}:${name}`, item);
      }
    }
  });

  return index;
}

export function resolveItineraryItemForCoveragePoi(
  poi: CoverageMapPoi,
  tripDays: TripDay[],
  items: ItineraryItemDetail[],
): ItineraryItemDetail | null {
  const index = buildCoveragePoiItemIndex(tripDays, items);

  const byOrder = index.get(`${poi.day}:${poi.order}`);
  if (byOrder) return byOrder;

  const byName = index.get(`${poi.day}:${poi.name}`);
  if (byName) return byName;

  const normalizedPoiName = poi.name.trim().toLowerCase();
  for (const [key, item] of index.entries()) {
    if (!key.startsWith(`${poi.day}:`) || !item.Place) continue;
    const name = placeDisplayName(item.Place).toLowerCase();
    if (name && (name === normalizedPoiName || name.includes(normalizedPoiName) || normalizedPoiName.includes(name))) {
      return item;
    }
  }

  return null;
}
