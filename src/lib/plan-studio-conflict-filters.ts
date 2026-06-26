import { DateTime } from 'luxon';
import type { ItineraryItemDetail, PlanStudioConflict } from '@/types/trip';
import {
  isCheckoutDisplayItem,
  isCheckinDisplayItem,
  readCrossDayInfo,
} from '@/lib/itinerary-item-sort';

function findItineraryItemById(
  map: Map<string, ItineraryItemDetail[]>,
  id: string,
): ItineraryItemDetail | undefined {
  for (const items of map.values()) {
    const found = items.find((i) => i.id === id);
    if (found) return found;
  }
  return undefined;
}

function samePlace(a: ItineraryItemDetail, b: ItineraryItemDetail): boolean {
  if (a.placeId != null && b.placeId != null && a.placeId === b.placeId) return true;
  const nameA = a.Place?.nameCN || a.Place?.nameEN;
  const nameB = b.Place?.nameCN || b.Place?.nameEN;
  return Boolean(nameA && nameB && nameA === nameB);
}

function isAccommodation(item: ItineraryItemDetail): boolean {
  return item.Place?.category === 'HOTEL' || item.costCategory === 'ACCOMMODATION';
}

function isCheckoutRole(item: ItineraryItemDetail): boolean {
  if (isCheckoutDisplayItem(item)) return true;
  const cross = readCrossDayInfo(item);
  return cross?.isCheckoutItem === true || cross?.displayMode === 'checkout';
}

function isCheckinRole(item: ItineraryItemDetail): boolean {
  if (isCheckinDisplayItem(item)) return true;
  const cross = readCrossDayInfo(item);
  return cross?.displayMode === 'checkin';
}

/** 同日早退房 + 晚入住同一酒店 */
export function isSameDayCheckoutCheckinPair(
  a: ItineraryItemDetail,
  b: ItineraryItemDetail,
): boolean {
  if (a.id === b.id) return false;
  if (!samePlace(a, b) || !isAccommodation(a) || !isAccommodation(b)) return false;

  const aCheckout = isCheckoutRole(a);
  const bCheckout = isCheckoutRole(b);
  const aCheckin = isCheckinRole(a);
  const bCheckin = isCheckinRole(b);

  if (!(aCheckout && bCheckin) && !(aCheckin && bCheckout)) return false;

  const checkout = aCheckout ? a : b;
  const checkin = aCheckin ? a : b;
  if (checkout.endTime && checkin.startTime) {
    const end = DateTime.fromISO(checkout.endTime);
    const start = DateTime.fromISO(checkin.startTime);
    if (end.isValid && start.isValid && end.toMillis() > start.toMillis()) {
      return false;
    }
  }
  return true;
}

const LUNCH_VALIDATION_CONFLICT_TYPES = new Set([
  'LUNCH_WINDOW',
  'MISSING_LUNCH',
  'LUNCH_MISSING',
]);

/** 午餐时间窗 / 未安排午餐等——不作为前端校验与冲突展示条件 */
export function isLunchValidationConflict(
  conflict: {
    type?: string;
    title?: string;
    description?: string;
  },
): boolean {
  const type = (conflict.type ?? '').toUpperCase();
  if (LUNCH_VALIDATION_CONFLICT_TYPES.has(type)) return true;

  const blob = `${conflict.title ?? ''}\n${conflict.description ?? ''}`;
  if (/午餐时间窗/.test(blob)) return true;
  if (/未安排午餐/.test(blob)) return true;
  if (/lunch\s*time\s*window/i.test(blob)) return true;
  if (/missing\s+lunch/i.test(blob)) return true;

  return false;
}

export function shouldSuppressDuplicateItemConflict(
  conflict: Pick<PlanStudioConflict, 'type' | 'affectedItemIds'>,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): boolean {
  if (conflict.type !== 'DUPLICATE_ITEM') return false;
  const ids = conflict.affectedItemIds ?? [];
  if (ids.length < 2) return false;

  const items = ids
    .map((id) => findItineraryItemById(itineraryItemsMap, id))
    .filter((item): item is ItineraryItemDetail => item != null);

  if (items.length < 2) return false;
  if (items.length === 2) {
    return isSameDayCheckoutCheckinPair(items[0], items[1]);
  }

  const checkoutItems = items.filter(isCheckoutRole);
  const checkinItems = items.filter(isCheckinRole);
  if (checkoutItems.length === 0 || checkinItems.length === 0) return false;
  if (checkoutItems.length !== checkinItems.length) return false;

  return checkoutItems.every((checkout) =>
    checkinItems.some((checkin) => isSameDayCheckoutCheckinPair(checkout, checkin)),
  );
}

export function filterPlanStudioConflicts(
  conflicts: PlanStudioConflict[],
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): PlanStudioConflict[] {
  return conflicts.filter(
    (c) =>
      !shouldSuppressDuplicateItemConflict(c, itineraryItemsMap) &&
      !isLunchValidationConflict(c),
  );
}

export function filterDayMetricConflicts<T extends { type?: string; title?: string; description?: string; affectedItemIds?: string[] }>(
  conflicts: T[],
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): T[] {
  return conflicts.filter(
    (c) =>
      !shouldSuppressDuplicateItemConflict(c as PlanStudioConflict, itineraryItemsMap) &&
      !isLunchValidationConflict(c),
  );
}
