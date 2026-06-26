import { DateTime } from 'luxon';
import type { CrossDayInfo, ItineraryItem } from '@/types/trip';
import { getExplicitItinerarySpecialDisplayRole } from '@/lib/itinerary-special-display';
import { isCarRentalItineraryItem } from '@/lib/trip-car-rental-status';

export type ItineraryItemSortFields = Pick<
  ItineraryItem,
  | 'startTime'
  | 'endTime'
  | 'crossDayInfo'
  | 'displaySortIndex'
  | 'id'
  | 'Place'
  | 'costCategory'
  | 'type'
>;

type CrossDayReadable = ItineraryItemSortFields & {
  cross_day_info?: CrossDayInfo | null;
  note?: string | null;
};

const ACCOMMODATION_NAME_RE =
  /山屋|民宿|酒店|旅馆|宾馆|营地|guesthouse|hostel|\bhut\b|lodge|住宿/i;

/** 行程项是否为住宿（酒店 / 山屋 / 民宿等） */
export function isAccommodationItineraryItem(
  item: ItineraryItemSortFields & { note?: string | null; metadata?: Record<string, unknown> | null },
): boolean {
  const explicit = getExplicitItinerarySpecialDisplayRole(item);
  if (explicit === 'hotel') return true;
  if (explicit) return false;

  if (
    item.Place?.category === 'HOTEL' ||
    item.costCategory === 'ACCOMMODATION'
  ) {
    return true;
  }
  const name = [
    item.Place?.nameCN,
    item.Place?.nameEN,
    item.note,
  ]
    .filter(Boolean)
    .join(' ');
  return name.length > 0 && ACCOMMODATION_NAME_RE.test(name);
}

function isHotelItem(item: ItineraryItemSortFields): boolean {
  return isAccommodationItineraryItem(item);
}

/** 兼容 camelCase / snake_case */
export function readCrossDayInfo(
  item: CrossDayReadable,
): CrossDayInfo | null | undefined {
  const raw = item.crossDayInfo ?? item.cross_day_info;
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}

function isCheckoutItem(item: CrossDayReadable): boolean {
  const cross = readCrossDayInfo(item);
  return cross?.displayMode === 'checkout' || cross?.isCheckoutItem === true;
}

export function isCheckoutDisplayItem(item: CrossDayReadable): boolean {
  return isOvernightStayDisplayItem(item);
}

function isCheckinItem(item: CrossDayReadable): boolean {
  return readCrossDayInfo(item)?.displayMode === 'checkin';
}

export function isCheckinDisplayItem(item: CrossDayReadable): boolean {
  return isAccommodationItineraryItem(item) && isCheckinItem(item);
}

/** 跨天行程项角标：住宿用入住/退房，租车用取车/还车，其余用跨天 */
export function getCrossDayBadgeLabel(
  item: ItineraryItemSortFields & CrossDayReadable & { note?: string | null },
): string | null {
  const cross = readCrossDayInfo(item);
  if (!cross?.isCrossDay) return null;

  if (isAccommodationItineraryItem(item)) {
    if (cross.displayMode === 'checkout' || cross.isCheckoutItem) return '退房';
    if (cross.displayMode === 'checkin') return '入住';
    return '跨天';
  }

  if (item.type === 'TRANSIT' || isCarRentalItineraryItem(item as ItineraryItem)) {
    if (cross.displayMode === 'checkout' || cross.isCheckoutItem) return '还车';
    if (cross.displayMode === 'checkin') return '取车';
    return '跨天';
  }

  return '跨天';
}

/** 住宿时间跨夜（如 20:20 → 次日 08:00） */
export function itemSpansOvernight(
  item: Pick<ItineraryItem, 'startTime' | 'endTime'>,
): boolean {
  if (!item.startTime || !item.endTime) return false;
  const start = DateTime.fromISO(item.startTime);
  const end = DateTime.fromISO(item.endTime);
  if (!start.isValid || !end.isValid) return false;
  if (start.toISODate() !== end.toISODate()) return true;
  return end.hour * 60 + end.minute < start.hour * 60 + start.minute;
}

/**
 * 跨夜住宿展示项（退房 / 入住 / 跨天酒店）。
 * 不代表当日行程起点，不应承接「自上一日衔接」交通。
 */
export function isOvernightStayDisplayItem(
  item: CrossDayReadable,
  dayItems?: ItineraryItemSortFields[],
): boolean {
  if (isAccommodationItineraryItem(item) && isCheckoutItem(item)) return true;

  const cross = readCrossDayInfo(item);
  if (cross?.isCrossDay && isAccommodationItineraryItem(item)) {
    if (cross.displayMode === 'checkin' || cross.displayMode === 'checkout') return true;
    if (isHotelItem(item)) return true;
  }

  if (isHotelItem(item) && itemSpansOvernight(item)) return true;

  const sortIdx = getDisplaySortIndex(item);
  if (sortIdx === 0 && isHotelItem(item)) return true;

  if (
    dayItems &&
    dayItems[0]?.id === item.id &&
    isAccommodationItineraryItem(item)
  ) {
    return true;
  }

  return false;
}

/**
 * 跨夜住宿挂在「退房日」API 列表时，整卡应在前一日时间轴展示。
 */
export function shouldRelocateOvernightToPriorDay(
  item: CrossDayReadable,
  dayItems: ItineraryItemSortFields[],
  dayIndex?: number,
): boolean {
  // 行程第一天无法挪到前一天，必须在本日时间轴展示
  if (dayIndex === 0) return false;
  // 仅住宿跨夜才承接至前一日；租车/交通跨天仍留在各自当天
  if (!isAccommodationItineraryItem(item)) return false;

  if (!isOvernightStayDisplayItem(item, dayItems)) return false;
  if (isCheckoutItem(item)) return true;
  if (getDisplaySortIndex(item) === 0 && dayItems[0]?.id === item.id) return true;
  const cross = readCrossDayInfo(item);
  if (
    cross?.isCrossDay &&
    (cross.displayMode === 'checkin' || cross.displayMode === 'checkout')
  ) {
    return true;
  }
  return isHotelItem(item) && itemSpansOvernight(item);
}

/** 退房日时间轴：不展示将挪到前一天的跨夜住宿整卡 */
export function filterCheckoutDayTimelineItems<T extends ItineraryItemSortFields>(
  items: T[],
  dayIndex?: number,
): T[] {
  return items.filter(
    (item) => !shouldRelocateOvernightToPriorDay(item, items, dayIndex),
  );
}

/** 前一日时间轴末尾：承接次日列表里的跨夜住宿 */
export function getOvernightItemsForPriorDayTimeline<T extends ItineraryItemSortFields>(
  nextDayItems: T[],
  nextDayIndex?: number,
): T[] {
  return nextDayItems.filter((item) =>
    shouldRelocateOvernightToPriorDay(item, nextDayItems, nextDayIndex),
  );
}

function normalizeTripDayDate(date: string): string {
  return date.includes('T') ? date.split('T')[0] : date;
}

/** 跨天行程项是否为退房/还车展示（API 在还车日返回的条目） */
export function isCrossDayCheckoutDisplayItem(item: CrossDayReadable): boolean {
  return isCheckoutItem(item);
}

/**
 * 将跨天租车项转为「还车」时间轴展示（仅 UI 层，不改后端数据）。
 */
export function buildCarRentalReturnTimelineItem<
  T extends ItineraryItemSortFields & CrossDayReadable & { note?: string | null },
>(item: T): T {
  const cross = readCrossDayInfo(item);
  const checkoutCross: CrossDayInfo = {
    isCrossDay: true,
    crossDays: cross?.crossDays ?? 0,
    isCheckoutItem: true,
    displayMode: 'checkout',
    timeLabels: {
      start: cross?.timeLabels?.start ?? '取车',
      end: cross?.timeLabels?.end ?? '还车',
    },
    displaySortIndex:
      cross?.displayMode === 'checkout' ? cross.displaySortIndex : undefined,
  };
  return {
    ...item,
    crossDayInfo: checkoutCross,
    displaySortIndex: checkoutCross.displaySortIndex,
  };
}

/**
 * 还车日时间轴：跨天租车通常只在取车日有一条 API 记录，需在 endTime 所在日合成「还车」卡。
 * 若还车日 API 已含 checkout 行，则不再重复合成。
 */
export function getCarRentalReturnItemsForDayTimeline<
  T extends ItineraryItemSortFields & CrossDayReadable & { note?: string | null },
>(
  tripDays: { date: string }[],
  dayIndex: number,
  itemsMap: Map<string, T[]>,
): T[] {
  const day = tripDays[dayIndex];
  if (!day) return [];

  const dayNorm = normalizeTripDayDate(day.date);
  const dayItems = itemsMap.get(day.date) ?? itemsMap.get(dayNorm) ?? [];
  const results: T[] = [];
  const seenIds = new Set<string>();

  for (const items of itemsMap.values()) {
    for (const item of items) {
      if (!isCarRentalItineraryItem(item as ItineraryItem)) continue;
      const cross = readCrossDayInfo(item);
      if (!cross?.isCrossDay || !item.endTime) continue;

      const endNorm = DateTime.fromISO(item.endTime).toISODate();
      if (!endNorm || endNorm !== dayNorm) continue;

      if (seenIds.has(item.id)) continue;

      const onDay = dayItems.find((d) => d.id === item.id);
      if (onDay && isCheckoutItem(onDay)) continue;

      const startNorm = item.startTime
        ? DateTime.fromISO(item.startTime).toISODate()
        : null;
      if (startNorm === dayNorm && onDay && !isCheckoutItem(onDay)) {
        // 取车日与还车日同一天：当日已有取车卡即可
        continue;
      }

      seenIds.add(item.id);
      results.push(buildCarRentalReturnTimelineItem(item));
    }
  }

  return results;
}

/** 当天首个真实活动（排除跨夜住宿展示项） */
export function getFirstDayActivityItem<T extends ItineraryItemSortFields>(
  items: T[],
): T | undefined {
  return items.find((item) => !isOvernightStayDisplayItem(item, items));
}

/** @deprecated 请用 getFirstDayActivityItem */
export function getFirstNonCheckoutItem<T extends ItineraryItemSortFields>(
  items: T[],
): T | undefined {
  return getFirstDayActivityItem(items);
}

export function getOvernightStayDisplayItem<T extends ItineraryItemSortFields>(
  items: T[],
): T | undefined {
  return items.find((item) => isOvernightStayDisplayItem(item, items));
}

/**
 * 退房后出发：跨夜住宿项在时间轴上位于其后首个活动之前（早退房再出门）。
 * 若住宿在当日末尾（傍晚入住），交通应落在两 POI 之间，而非顶部 lead-in。
 */
export function getCheckoutMorningTravelPair<T extends ItineraryItemSortFields>(
  items: T[],
): { overnightItem: T; nextActivityItem: T } | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isOvernightStayDisplayItem(item, items)) continue;
    const nextActivityItem = items
      .slice(i + 1)
      .find((x) => !isOvernightStayDisplayItem(x, items));
    if (nextActivityItem) {
      return { overnightItem: item, nextActivityItem };
    }
    break;
  }
  return null;
}

/** @deprecated 请用 getOvernightStayDisplayItem */
export function getCheckoutDisplayItem<T extends ItineraryItemSortFields>(
  items: T[],
): T | undefined {
  return getOvernightStayDisplayItem(items);
}

/**
 * 后端 displaySortIndex：0 = 退房/跨夜住宿置顶，1+ = 其余活动。
 */
export function getDisplaySortIndex(
  item: Pick<ItineraryItem, 'crossDayInfo' | 'displaySortIndex'> & CrossDayReadable,
): number | null {
  if (typeof item.displaySortIndex === 'number' && Number.isFinite(item.displaySortIndex)) {
    return item.displaySortIndex;
  }
  const nested = readCrossDayInfo(item)?.displaySortIndex;
  if (typeof nested === 'number' && Number.isFinite(nested)) {
    return nested;
  }
  return null;
}

export function itineraryItemsHaveDisplaySortIndex(items: ItineraryItemSortFields[]): boolean {
  return items.length > 0 && items.every((item) => getDisplaySortIndex(item) != null);
}

export function getItineraryItemTimelineSortKey(
  item: Pick<ItineraryItem, 'startTime' | 'endTime' | 'crossDayInfo'> & CrossDayReadable,
): string {
  if (isCheckoutItem(item)) {
    return item.endTime || item.startTime || '';
  }
  if (isOvernightStayDisplayItem(item) && item.endTime) {
    return item.endTime;
  }
  if (isCheckinItem(item)) {
    return item.startTime || item.endTime || '';
  }
  return item.startTime || item.endTime || '';
}

export function compareItineraryItemsByTimeline<T extends ItineraryItemSortFields>(
  a: T,
  b: T,
): number {
  const keyA = getItineraryItemTimelineSortKey(a);
  const keyB = getItineraryItemTimelineSortKey(b);
  const byTime = keyA.localeCompare(keyB);
  if (byTime !== 0) return byTime;
  return (a.id || '').localeCompare(b.id || '');
}

export function compareItineraryItemsForDisplay<T extends ItineraryItemSortFields>(
  a: T,
  b: T,
): number {
  const idxA =
    getDisplaySortIndex(a) ?? (isOvernightStayDisplayItem(a) ? 0 : null);
  const idxB =
    getDisplaySortIndex(b) ?? (isOvernightStayDisplayItem(b) ? 0 : null);

  if (idxA != null && idxB != null) {
    const byIndex = idxA - idxB;
    if (byIndex !== 0) return byIndex;
  } else if (idxA != null && idxB == null) {
    return -1;
  } else if (idxA == null && idxB != null) {
    return 1;
  } else {
    const aOvernight = isOvernightStayDisplayItem(a);
    const bOvernight = isOvernightStayDisplayItem(b);
    if (aOvernight && !bOvernight) return -1;
    if (!aOvernight && bOvernight) return 1;
  }

  return compareItineraryItemsByTimeline(a, b);
}

/** @deprecated 请用 sortItineraryItemsForDisplay */
export function sortItineraryItemsByTimeline<T extends ItineraryItemSortFields>(
  items: T[],
): T[] {
  return sortItineraryItemsForDisplay(items);
}

export function sortItineraryItemsForDisplay<T extends ItineraryItemSortFields>(
  items: T[],
): T[] {
  if (itineraryItemsHaveDisplaySortIndex(items)) {
    return [...items].sort((a, b) => {
      const d = getDisplaySortIndex(a)! - getDisplaySortIndex(b)!;
      if (d !== 0) return d;
      return (a.id || '').localeCompare(b.id || '');
    });
  }
  return [...items].sort(compareItineraryItemsForDisplay);
}
