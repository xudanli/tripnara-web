import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { isOvernightStayDisplayItem } from '@/lib/itinerary-item-sort';

function normalizeDayDate(dayDate: string): string {
  return dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
}

/** 行程项变更后需重算交通的天（含相邻天，覆盖跨夜住宿衔接） */
export function resolveTravelRecalcDayIds(
  trip: TripDetail | null | undefined,
  primaryDayId: string | undefined,
  editedItem?: ItineraryItemDetail | null,
): string[] {
  if (!primaryDayId) return [];
  const ids = new Set<string>([primaryDayId]);
  const days = trip?.TripDay ?? [];
  const idx = days.findIndex((d) => d.id === primaryDayId);
  if (idx > 0) ids.add(days[idx - 1].id);
  if (idx >= 0 && idx < days.length - 1) ids.add(days[idx + 1].id);
  if (editedItem && isOvernightStayDisplayItem(editedItem)) {
    if (idx > 0) ids.add(days[idx - 1].id);
    if (idx >= 0 && idx < days.length - 1) ids.add(days[idx + 1].id);
  }
  return [...ids];
}

export function resolveAffectedDayDates(
  trip: TripDetail | null | undefined,
  dayIds: string[],
): string[] {
  if (!trip?.TripDay?.length || dayIds.length === 0) return [];
  return trip.TripDay
    .filter((d) => dayIds.includes(d.id))
    .map((d) => normalizeDayDate(d.date));
}
