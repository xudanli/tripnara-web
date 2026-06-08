/**
 * 加载已落库行程项，供 VERIFY POI_CLOSED 与规划工作台时间对齐。
 */

import { tripsApi, itineraryItemsApi } from '@/api/trips';
import {
  collectTripPoiSchedulesFromItineraryItems,
  type TimelinePoiScheduleContext,
} from '@/utils/opening-hours-schedule-check';
import type { ItineraryItemDetail } from '@/types/trip';

/** 并行拉取各天行程项（含 Place 补水），构建 POI 计划时间表 */
export async function fetchTripPoiSchedules(tripId: string): Promise<TimelinePoiScheduleContext[]> {
  const trip = await tripsApi.getById(tripId);
  const days = trip.TripDay ?? [];
  if (!days.length) return [];

  const groups = await Promise.all(
    days.map(async (day) => {
      try {
        return await itineraryItemsApi.getAll(day.id, true);
      } catch {
        return (day.ItineraryItem ?? []) as ItineraryItemDetail[];
      }
    })
  );

  return collectTripPoiSchedulesFromItineraryItems(groups.flat());
}
