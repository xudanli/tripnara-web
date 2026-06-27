import { sortItineraryItemsForDisplay } from '@/lib/itinerary-item-sort';
import type {
  DayMetricsResponse,
  DayTravelInfoResponse,
  ItineraryItemDetail,
  ScheduleItem,
  ScheduleResponse,
  TripDetail,
} from '@/types/trip';
import type {
  ScheduleTimelineDay,
  ScheduleTimelineInclude,
  ScheduleTimelineResponse,
} from '@/types/schedule-timeline';

export interface ScheduleTimelineMaps {
  itemsMap: Map<string, ItineraryItemDetail[]>;
  scheduleMap: Map<string, ScheduleResponse>;
  metricsMap: Map<string, DayMetricsResponse>;
  travelInfoMap: Map<string, DayTravelInfoResponse>;
}

function normalizeDayDate(dayDate: string): string {
  return dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
}

function storeDayTravelInfo(
  map: Map<string, DayTravelInfoResponse>,
  dayDate: string,
  travelInfo: DayTravelInfoResponse,
): void {
  map.set(dayDate, travelInfo);
  const normalized = normalizeDayDate(dayDate);
  if (normalized !== dayDate) map.set(normalized, travelInfo);
}

export function isScheduleTimelineUnavailable(error: unknown): boolean {
  return isAggregateReadEndpointUnavailable(error);
}

/** 从 TripDetail / schedule-timeline.trip 解析时间轴 revision */
export function resolveTripScheduleRevision(
  trip: Pick<TripDetail, 'revision' | 'metadata'> | null | undefined,
): number | undefined {
  if (!trip) return undefined;
  if (typeof trip.revision === 'number' && Number.isFinite(trip.revision)) {
    return trip.revision;
  }
  const meta = trip.metadata?.revision;
  if (typeof meta === 'number' && Number.isFinite(meta)) return meta;
  return undefined;
}

/** generate/commit 前取最新的 scheduleRevision（本地 trip、父级 initialTrip 取较大值） */
export function resolveExecuteScheduleRevision(
  ...sources: Array<Pick<TripDetail, 'revision' | 'metadata'> | null | undefined>
): number | undefined {
  const values = sources
    .map(resolveTripScheduleRevision)
    .filter((n): n is number => typeof n === 'number');
  return values.length > 0 ? Math.max(...values) : undefined;
}

/** 404/501：聚合读模型（timeline / batch travel-info）未部署 */
export function isAggregateReadEndpointUnavailable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'NOT_FOUND' || code === 'ENDPOINT_NOT_FOUND') return true;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501;
}

/** 超长行程分页：超过此天数启用 from/limit 懒加载 */
export const SCHEDULE_TIMELINE_LAZY_DAY_THRESHOLD = 14;

/** 时间轴懒加载每页天数 */
export const SCHEDULE_TIMELINE_PAGE_SIZE = 7;

export function shouldUseTimelineWindowedLoad(dayCount: number): boolean {
  return dayCount > SCHEDULE_TIMELINE_LAZY_DAY_THRESHOLD;
}

export function countCalendarDaysBetween(startDate: string, endDate: string): number {
  const start = normalizeDayDate(startDate);
  const end = normalizeDayDate(endDate);
  const startMs = Date.parse(`${start}T12:00:00.000Z`);
  const endMs = Date.parse(`${end}T12:00:00.000Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

export function resolveTimelineWindowParams(
  dayCount: number,
  opts?: { from?: number; limit?: number },
): { from?: number; limit?: number } {
  if (opts?.from != null || opts?.limit != null) {
    return { from: opts.from, limit: opts.limit };
  }
  if (!shouldUseTimelineWindowedLoad(dayCount)) return {};
  return { from: 0, limit: SCHEDULE_TIMELINE_PAGE_SIZE };
}

/** 由 start/end 生成 TripDay 骨架（id 待 timeline 补齐） */
export function buildTripDaySkeletonFromTripDates(
  startDate: string,
  endDate: string,
  knownDays?: ScheduleTimelineDay[],
): NonNullable<TripDetail['TripDay']> {
  const start = normalizeDayDate(startDate);
  const end = normalizeDayDate(endDate);
  const knownByDate = new Map(
    (knownDays ?? []).map((d) => [normalizeDayDate(d.date), d]),
  );
  const days: NonNullable<TripDetail['TripDay']> = [];
  let curMs = Date.parse(`${start}T12:00:00.000Z`);
  const endMs = Date.parse(`${end}T12:00:00.000Z`);
  while (curMs <= endMs) {
    const date = new Date(curMs).toISOString().slice(0, 10);
    const known = knownByDate.get(date);
    days.push({
      id: known?.dayId ?? `pending-${date}`,
      date: known?.date ?? date,
      ItineraryItem: [],
    });
    curMs += 86_400_000;
  }
  return days;
}

/** 将 timeline 响应合成为 ScheduleTab 所需的 TripDetail（可省掉首屏 getById） */
export function buildTripDetailFromTimeline(
  timeline: ScheduleTimelineResponse,
  fallback?: TripDetail | null,
): TripDetail {
  let tripDays: TripDetail['TripDay'];

  if (fallback?.TripDay?.length) {
    tripDays = mergeTripDaysFromTimeline(
      { ...fallback, TripDay: fallback.TripDay },
      timeline.days,
    ).TripDay;
  } else if (timeline.trip.startDate && timeline.trip.endDate) {
    tripDays = buildTripDaySkeletonFromTripDates(
      timeline.trip.startDate,
      timeline.trip.endDate,
      timeline.days,
    );
  } else {
    tripDays = timeline.days.map((d, index) => ({
      id: d.dayId,
      date: d.date,
      ItineraryItem: [],
      dayIndex: d.dayIndex ?? index,
    }));
  }

  return {
    ...(fallback ?? {}),
    ...timeline.trip,
    id: timeline.tripId || timeline.trip.id || fallback?.id || '',
    TripDay: tripDays?.length ? tripDays : fallback?.TripDay ?? [],
  } as TripDetail;
}

/** 将 timeline 天数据合并进已有 TripDetail.TripDay（dayId 补齐） */
export function mergeTripDaysFromTimeline(
  trip: TripDetail,
  days: ScheduleTimelineDay[],
): TripDetail {
  if (!days.length) return trip;
  const byDate = new Map(days.map((d) => [normalizeDayDate(d.date), d]));
  const mergedDays = (trip.TripDay ?? []).map((day) => {
    const key = normalizeDayDate(day.date);
    const fromTimeline = byDate.get(key);
    if (!fromTimeline) return day;
    return {
      ...day,
      id: fromTimeline.dayId || day.id,
      date: fromTimeline.date || day.date,
    };
  });
  return { ...trip, TripDay: mergedDays };
}

export function applyScheduleTimelineToMaps(
  timeline: ScheduleTimelineResponse,
  convertItineraryItemsToScheduleItems: (items: ItineraryItemDetail[]) => ScheduleItem[],
  tripDays?: TripDetail['TripDay'],
): ScheduleTimelineMaps {
  const itemsMap = new Map<string, ItineraryItemDetail[]>();
  const scheduleMap = new Map<string, ScheduleResponse>();
  const metricsMap = new Map<string, DayMetricsResponse>();
  const travelInfoMap = new Map<string, DayTravelInfoResponse>();

  const fallbackDayByDate = new Map(
    (tripDays ?? []).map((d) => [normalizeDayDate(d.date), d]),
  );

  for (const day of timeline.days) {
    const dateKey = normalizeDayDate(day.date);
    const fallback = fallbackDayByDate.get(dateKey);

    let dayItems: ItineraryItemDetail[] | null = null;
    if (day.itineraryItems?.length) {
      dayItems = sortItineraryItemsForDisplay(day.itineraryItems);
    } else if (fallback?.ItineraryItem?.length) {
      dayItems = fallback.ItineraryItem as ItineraryItemDetail[];
    }

    if (dayItems?.length) {
      itemsMap.set(day.date, dayItems);
      if (dateKey !== day.date) itemsMap.set(dateKey, dayItems);
    }

    const scheduleResponse = day.schedule;
    if (
      scheduleResponse?.schedule?.items &&
      scheduleResponse.schedule.items.length > 0
    ) {
      scheduleMap.set(day.date, scheduleResponse);
    } else if (dayItems?.length) {
      const scheduleItems = convertItineraryItemsToScheduleItems(dayItems);
      scheduleMap.set(day.date, {
        date: day.date,
        schedule: scheduleItems.length > 0 ? { items: scheduleItems } : null,
        persisted: false,
      });
    } else if (fallback?.ItineraryItem?.length) {
      const scheduleItems = convertItineraryItemsToScheduleItems(
        fallback.ItineraryItem as ItineraryItemDetail[],
      );
      scheduleMap.set(day.date, {
        date: day.date,
        schedule: scheduleItems.length > 0 ? { items: scheduleItems } : null,
        persisted: false,
      });
    } else {
      scheduleMap.set(day.date, {
        date: day.date,
        schedule: null,
        persisted: false,
      });
    }

    if (day.metrics) {
      metricsMap.set(day.metrics.date, day.metrics);
      metricsMap.set(dateKey, day.metrics);
    }

    if (day.travelInfo?.segments?.length) {
      storeDayTravelInfo(travelInfoMap, day.date, day.travelInfo);
    }
  }

  return { itemsMap, scheduleMap, metricsMap, travelInfoMap };
}

/** 增量合并 timeline 窗口（P2 懒加载下一页） */
export function mergeScheduleTimelineIntoMaps(
  existing: ScheduleTimelineMaps,
  timeline: ScheduleTimelineResponse,
  convertItineraryItemsToScheduleItems: (items: ItineraryItemDetail[]) => ScheduleItem[],
  tripDays?: TripDetail['TripDay'],
): ScheduleTimelineMaps {
  const patch = applyScheduleTimelineToMaps(
    timeline,
    convertItineraryItemsToScheduleItems,
    tripDays,
  );
  const itemsMap = new Map(existing.itemsMap);
  const scheduleMap = new Map(existing.scheduleMap);
  const metricsMap = new Map(existing.metricsMap);
  const travelInfoMap = new Map(existing.travelInfoMap);
  patch.itemsMap.forEach((value, key) => itemsMap.set(key, value));
  patch.scheduleMap.forEach((value, key) => scheduleMap.set(key, value));
  patch.metricsMap.forEach((value, key) => metricsMap.set(key, value));
  patch.travelInfoMap.forEach((value, key) => travelInfoMap.set(key, value));
  return { itemsMap, scheduleMap, metricsMap, travelInfoMap };
}

export function timelineIncludes(
  include: string | undefined,
  part: ScheduleTimelineInclude,
): boolean {
  if (!include) return true;
  return include.split(',').map((s) => s.trim()).includes(part);
}
