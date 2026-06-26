import type {
  ItineraryPresentationBundle,
  PresentedItineraryDay,
  PresentedItineraryItem,
} from '@/types/experience-fulfillment';

export interface ItineraryPresentationLookup {
  dayByNumber: Map<number, PresentedItineraryDay>;
  /** `${dayNumber}:${placeId}` → 候选列表（同 POI 多次出现时按时间消歧） */
  itemsByDayPlace: Map<string, PresentedItineraryItem[]>;
}

function dayPlaceKey(dayNumber: number, placeId: number): string {
  return `${dayNumber}:${placeId}`;
}

function normalizeTimeHint(value: string | undefined | null): string | undefined {
  if (!value?.trim()) return undefined;
  const t = value.trim();
  const m = t.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : t;
}

/** 从 trip.metadata / draft 构建 Schedule Tab 查找表 */
export function buildItineraryPresentationLookup(
  bundle: ItineraryPresentationBundle | undefined | null,
): ItineraryPresentationLookup | null {
  if (!bundle?.days?.length) return null;

  const dayByNumber = new Map<number, PresentedItineraryDay>();
  const itemsByDayPlace = new Map<string, PresentedItineraryItem[]>();

  for (const day of bundle.days) {
    dayByNumber.set(day.day, day);
    for (const item of day.items ?? []) {
      const key = dayPlaceKey(day.day, item.placeId);
      const list = itemsByDayPlace.get(key) ?? [];
      list.push(item);
      itemsByDayPlace.set(key, list);
    }
  }

  return { dayByNumber, itemsByDayPlace };
}

/** 匹配某日程项对应的 presentation 条目 */
export function matchPresentedItineraryItem(
  lookup: ItineraryPresentationLookup | null | undefined,
  options: {
    dayNumber: number;
    placeId?: number | null;
    localStartTime?: string | null;
  },
): PresentedItineraryItem | undefined {
  if (!lookup || options.placeId == null) return undefined;

  const candidates = lookup.itemsByDayPlace.get(dayPlaceKey(options.dayNumber, options.placeId));
  if (!candidates?.length) return undefined;
  if (candidates.length === 1) return candidates[0];

  const hint = normalizeTimeHint(options.localStartTime);
  if (hint) {
    const byTime = candidates.find(
      (c) => normalizeTimeHint(c.startTime) === hint,
    );
    if (byTime) return byTime;
  }

  return candidates[0];
}

export function getPresentedItineraryDay(
  lookup: ItineraryPresentationLookup | null | undefined,
  dayNumber: number,
): PresentedItineraryDay | undefined {
  return lookup?.dayByNumber.get(dayNumber);
}
