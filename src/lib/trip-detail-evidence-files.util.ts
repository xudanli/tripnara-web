import type { TripFileOverviewItem } from '@/types/trip-files';

const FILE_EVIDENCE_PATTERNS = [
  /trip_file/i,
  /itinerary_(booking|link|pending)/i,
  /booking/i,
  /receipt/i,
  /visa/i,
  /insurance/i,
  /upload/i,
  /确认资料/,
  /预订凭证/,
];

/** 决策证据引用是否可能对应「文件 Tab」中的凭证 */
export function evidenceRefsSuggestTripFiles(refs: string[]): boolean {
  return refs.some((raw) => {
    const t = raw.trim();
    if (!t) return false;
    return FILE_EVIDENCE_PATTERNS.some((pattern) => pattern.test(t));
  });
}

export function isItinerarySourcedFile(item: TripFileOverviewItem): boolean {
  return (
    item.source === 'itinerary_booking' ||
    item.source === 'itinerary_link' ||
    item.source === 'itinerary_pending'
  );
}

export function partitionTripFileOverviewItems(items: TripFileOverviewItem[]): {
  itineraryLinked: TripFileOverviewItem[];
  uploaded: TripFileOverviewItem[];
  pending: TripFileOverviewItem[];
} {
  const itineraryLinked: TripFileOverviewItem[] = [];
  const uploaded: TripFileOverviewItem[] = [];
  const pending: TripFileOverviewItem[] = [];

  for (const item of items) {
    if (item.status === 'PENDING' || item.source === 'itinerary_pending') {
      pending.push(item);
    } else if (isItinerarySourcedFile(item)) {
      itineraryLinked.push(item);
    } else if (item.source === 'trip_file') {
      uploaded.push(item);
    }
  }

  return { itineraryLinked, uploaded, pending };
}

/** 按行程项 id 聚合凭证（供决策 ↔ 文件跳转） */
export function groupTripFilesByItineraryItemId(
  items: TripFileOverviewItem[],
): Map<string, TripFileOverviewItem[]> {
  const map = new Map<string, TripFileOverviewItem[]>();
  for (const item of items) {
    const key = item.itineraryItemId?.trim();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
