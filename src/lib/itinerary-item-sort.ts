import type { ItineraryItem } from '@/types/trip';

export type ItineraryItemSortFields = Pick<
  ItineraryItem,
  'startTime' | 'endTime' | 'crossDayInfo' | 'displaySortIndex' | 'id'
>;

function isCheckoutItem(item: Pick<ItineraryItem, 'crossDayInfo'>): boolean {
  return (
    item.crossDayInfo?.displayMode === 'checkout' || item.crossDayInfo?.isCheckoutItem === true
  );
}

function isCheckinItem(item: Pick<ItineraryItem, 'crossDayInfo'>): boolean {
  return item.crossDayInfo?.displayMode === 'checkin';
}

/**
 * 后端 displaySortIndex：0 = 退房，1+ = 其余活动。
 * 可读顶层或 crossDayInfo 内字段。
 */
export function getDisplaySortIndex(
  item: Pick<ItineraryItem, 'crossDayInfo' | 'displaySortIndex'>
): number | null {
  if (typeof item.displaySortIndex === 'number' && Number.isFinite(item.displaySortIndex)) {
    return item.displaySortIndex;
  }
  const nested = item.crossDayInfo?.displaySortIndex;
  if (typeof nested === 'number' && Number.isFinite(nested)) {
    return nested;
  }
  return null;
}

/** 是否整组数据都带 displaySortIndex（可完全信任序号排序） */
export function itineraryItemsHaveDisplaySortIndex(items: ItineraryItemSortFields[]): boolean {
  return items.length > 0 && items.every((item) => getDisplaySortIndex(item) != null);
}

/**
 * 时间轴兜底排序键（无 displaySortIndex 时）：
 * - 退房：endTime
 * - 入住 / 普通项：startTime
 */
export function getItineraryItemTimelineSortKey(
  item: Pick<ItineraryItem, 'startTime' | 'endTime' | 'crossDayInfo'>
): string {
  if (isCheckoutItem(item)) {
    return item.endTime || item.startTime || '';
  }
  if (isCheckinItem(item)) {
    return item.startTime || item.endTime || '';
  }
  return item.startTime || item.endTime || '';
}

export function compareItineraryItemsByTimeline<T extends ItineraryItemSortFields>(a: T, b: T): number {
  const keyA = getItineraryItemTimelineSortKey(a);
  const keyB = getItineraryItemTimelineSortKey(b);
  const byTime = keyA.localeCompare(keyB);
  if (byTime !== 0) return byTime;
  return (a.id || '').localeCompare(b.id || '');
}

/**
 * 展示排序：displaySortIndex 优先 → 退房置顶(0) → 时间轴 → id。
 * 与 GET /itinerary-items、GET /trips 返回序对齐。
 */
export function compareItineraryItemsForDisplay<T extends ItineraryItemSortFields>(a: T, b: T): number {
  const idxA = getDisplaySortIndex(a) ?? (isCheckoutItem(a) ? 0 : null);
  const idxB = getDisplaySortIndex(b) ?? (isCheckoutItem(b) ? 0 : null);

  if (idxA != null && idxB != null) {
    const byIndex = idxA - idxB;
    if (byIndex !== 0) return byIndex;
  } else if (idxA != null && idxB == null) {
    return -1;
  } else if (idxA == null && idxB != null) {
    return 1;
  } else {
    const aCheckout = isCheckoutItem(a);
    const bCheckout = isCheckoutItem(b);
    if (aCheckout && !bCheckout) return -1;
    if (!aCheckout && bCheckout) return 1;
  }

  return compareItineraryItemsByTimeline(a, b);
}

/** @deprecated 请用 sortItineraryItemsForDisplay */
export function sortItineraryItemsByTimeline<T extends ItineraryItemSortFields>(items: T[]): T[] {
  return sortItineraryItemsForDisplay(items);
}

export function sortItineraryItemsForDisplay<T extends ItineraryItemSortFields>(items: T[]): T[] {
  if (itineraryItemsHaveDisplaySortIndex(items)) {
    return [...items].sort((a, b) => {
      const d = getDisplaySortIndex(a)! - getDisplaySortIndex(b)!;
      if (d !== 0) return d;
      return (a.id || '').localeCompare(b.id || '');
    });
  }
  return [...items].sort(compareItineraryItemsForDisplay);
}
