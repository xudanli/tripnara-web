import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import {
  getOvernightItemsForPriorDayTimeline,
  isCheckinDisplayItem,
  isAccommodationItineraryItem,
  itemSpansOvernight,
  shouldRelocateOvernightToPriorDay,
} from '@/lib/itinerary-item-sort';

function normalizeDayDate(dayDate: string): string {
  return dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
}

function isAccommodationItem(item: ItineraryItemDetail): boolean {
  return isAccommodationItineraryItem(item);
}

/**
 * 当日行程中的住宿项是否表示「今晚入住」（非仅承接昨夜的退房展示项）。
 */
function isEveningCheckinAccommodationOnDay(
  item: ItineraryItemDetail,
  dayItems: ItineraryItemDetail[],
  dayIndex: number,
): boolean {
  if (!isAccommodationItem(item)) return false;
  if (shouldRelocateOvernightToPriorDay(item, dayItems, dayIndex)) return false;
  if (isCheckinDisplayItem(item)) return true;
  if (itemSpansOvernight(item)) return true;
  return true;
}

export function nightAfterDayIsCovered(
  dayIndex: number,
  trip: TripDetail,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): boolean {
  const days = trip.TripDay ?? [];
  if (dayIndex < 0 || dayIndex >= days.length) return true;

  const day = days[dayIndex];
  const norm = normalizeDayDate(day.date);
  const dayItems =
    itineraryItemsMap.get(day.date) ?? itineraryItemsMap.get(norm) ?? [];

  if (dayItems.some((item) => isEveningCheckinAccommodationOnDay(item, dayItems, dayIndex))) {
    return true;
  }

  const nextDay = days[dayIndex + 1];
  if (nextDay) {
    const nextNorm = normalizeDayDate(nextDay.date);
    const nextItems =
      itineraryItemsMap.get(nextDay.date) ??
      itineraryItemsMap.get(nextNorm) ??
      [];
    const bridged = getOvernightItemsForPriorDayTimeline(nextItems, dayIndex + 1);
    if (bridged.some(isAccommodationItem)) return true;
  }

  return false;
}

export type DayAccommodationCoverage = {
  needsAccommodation: boolean;
  hasAccommodation: boolean;
  message: string;
  accommodationLabel?: string;
  accommodationItemId?: string;
};

function findNightAccommodationItem(
  dayIndex: number,
  trip: TripDetail,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): ItineraryItemDetail | undefined {
  const days = trip.TripDay ?? [];
  const day = days[dayIndex];
  if (!day) return undefined;

  const norm = normalizeDayDate(day.date);
  const dayItems =
    itineraryItemsMap.get(day.date) ?? itineraryItemsMap.get(norm) ?? [];

  const onDay = dayItems.find((item) =>
    isEveningCheckinAccommodationOnDay(item, dayItems, dayIndex),
  );
  if (onDay) return onDay;

  const nextDay = days[dayIndex + 1];
  if (!nextDay) return undefined;

  const nextNorm = normalizeDayDate(nextDay.date);
  const nextItems =
    itineraryItemsMap.get(nextDay.date) ?? itineraryItemsMap.get(nextNorm) ?? [];
  return getOvernightItemsForPriorDayTimeline(nextItems, dayIndex + 1).find(isAccommodationItem);
}

function accommodationItemLabel(item: ItineraryItemDetail): string {
  return (
    item.Place?.nameCN ||
    item.Place?.nameEN ||
    item.note?.trim() ||
    '住宿'
  );
}

export function analyzeDayAccommodationCoverage(
  dayIndex: number,
  trip: TripDetail,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): DayAccommodationCoverage {
  const days = trip.TripDay ?? [];
  if (dayIndex < 0 || dayIndex >= days.length) {
    return { needsAccommodation: false, hasAccommodation: true, message: '' };
  }

  const isLastDay = dayIndex === days.length - 1;
  if (isLastDay) {
    return { needsAccommodation: false, hasAccommodation: true, message: '' };
  }

  const accommodationItem = findNightAccommodationItem(
    dayIndex,
    trip,
    itineraryItemsMap,
  );
  const hasAccommodation = accommodationItem != null;

  return {
    needsAccommodation: true,
    hasAccommodation,
    accommodationLabel: accommodationItem
      ? accommodationItemLabel(accommodationItem)
      : undefined,
    accommodationItemId: accommodationItem?.id,
    message: hasAccommodation
      ? ''
      : '当晚尚未安排住宿。请添加酒店或民宿，以便安排次日出发与交通。',
  };
}
