import { itineraryItemsApi } from '@/api/trips';
import {
  INTENT_TRAVEL_MODE_MAP,
  TRIP_TRAVEL_MODE_MAP,
} from '@/constants/itinerary-optimization';
import { isSelfDrivePlanningTrip } from '@/lib/trip-self-drive';
import {
  getFirstDayActivityItem,
  getOvernightStayDisplayItem,
  isOvernightStayDisplayItem,
} from '@/lib/itinerary-item-sort';
import {
  IntentTravelMode,
  type DayTravelInfoResponse,
  type ItineraryItemDetail,
  type TravelMode,
  type TravelSegment,
  type TripDetail,
} from '@/types/trip';

function normalizeDayDate(dayDate: string): string {
  return dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
}

/** 行程 intent / pacing 出行方式 → calculate-travel defaultTravelMode */
export function resolveItineraryDefaultTravelMode(
  trip: TripDetail | null | undefined,
  intentTravelMode?: IntentTravelMode | string | null,
): TravelMode | undefined {
  if (!trip) return undefined;

  const mode = intentTravelMode ?? trip.pacingConfig?.travelMode;

  if (mode === IntentTravelMode.DRIVING || mode === 'DRIVING') return 'DRIVING';
  if (mode === IntentTravelMode.PUBLIC_TRANSIT || mode === 'PUBLIC_TRANSIT') return 'TRANSIT';

  if (mode === IntentTravelMode.MIXED || mode === 'MIXED') {
    return isSelfDrivePlanningTrip(trip) ? 'DRIVING' : 'TRANSIT';
  }

  const mapped =
    (mode ? INTENT_TRAVEL_MODE_MAP[String(mode)] : undefined) ??
    (mode ? TRIP_TRAVEL_MODE_MAP[String(mode)] : undefined);
  if (mapped) return mapped as TravelMode;

  if (isSelfDrivePlanningTrip(trip)) return 'DRIVING';

  return undefined;
}

export function travelSegmentHasData(segment: TravelSegment | null | undefined): boolean {
  if (!segment) return false;
  return (
    segment.duration !== null && segment.duration !== undefined ||
    segment.distance !== null && segment.distance !== undefined ||
    segment.travelMode !== null && segment.travelMode !== undefined
  );
}

function storeDayTravelInfo(
  map: Map<string, DayTravelInfoResponse>,
  dayDate: string,
  travelInfo: DayTravelInfoResponse,
): void {
  map.set(dayDate, travelInfo);
  const normalized = dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
  if (normalized !== dayDate) map.set(normalized, travelInfo);
}

/** POST calculate-travel 后 GET travel-info（单天） */
export async function calculateDayTravelAndFetchInfo(
  tripId: string,
  dayId: string,
  defaultTravelMode?: TravelMode,
): Promise<DayTravelInfoResponse | null> {
  try {
    await itineraryItemsApi.calculateDayTravel(
      tripId,
      dayId,
      defaultTravelMode ? { defaultTravelMode } : {},
    );
  } catch (err) {
    console.warn('[itinerary-travel-info] calculateDayTravel failed:', err);
  }

  try {
    return await itineraryItemsApi.getDayTravelInfo(tripId, dayId);
  } catch (err) {
    console.debug('[itinerary-travel-info] getDayTravelInfo failed:', err);
    return null;
  }
}

/** 只读拉取 travel-info（不触发重算） */
export async function fetchDayTravelInfo(
  tripId: string,
  dayId: string,
): Promise<DayTravelInfoResponse | null> {
  try {
    return await itineraryItemsApi.getDayTravelInfo(tripId, dayId);
  } catch {
    return null;
  }
}

/** 加载整趟行程各天 travel-info；多天时先触发全行程重算以补齐跨天段 */
export async function loadTripDayTravelInfoMap(
  tripId: string,
  trip: TripDetail,
): Promise<Map<string, DayTravelInfoResponse>> {
  const map = new Map<string, DayTravelInfoResponse>();
  const dayCount = trip.TripDay?.length ?? 0;

  if (dayCount > 1) {
    const mode = resolveItineraryDefaultTravelMode(trip);
    try {
      await itineraryItemsApi.calculateAllTravel(
        tripId,
        mode ? { defaultTravelMode: mode } : {},
      );
    } catch (err) {
      console.warn('[itinerary-travel-info] calculateAllTravel failed:', err);
    }
  }

  for (const day of trip.TripDay ?? []) {
    const travelInfo = await fetchDayTravelInfo(tripId, day.id);
    if (travelInfo?.segments?.length) {
      storeDayTravelInfo(map, day.date, travelInfo);
    }
  }

  return map;
}

/** 第 N 天结束 → 第 N+1 天开始的交通段（跨天衔接；不含「昨夜住宿退房项」） */
export function findInterDayTravelSegment(
  trip: TripDetail,
  fromDayIndex: number,
  dayTravelInfoMap: Map<string, DayTravelInfoResponse>,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): TravelSegment | null {
  const days = trip.TripDay ?? [];
  if (fromDayIndex < 0 || fromDayIndex >= days.length - 1) return null;

  const nextDay = days[fromDayIndex + 1];
  const nextNorm = normalizeDayDate(nextDay.date);
  const nextItems =
    itineraryItemsMap.get(nextDay.date) ?? itineraryItemsMap.get(nextNorm) ?? [];

  if (getOvernightStayDisplayItem(nextItems)) return null;

  const firstNext = getFirstDayActivityItem(nextItems);
  if (!firstNext) return null;

  const travelInfo = dayTravelInfoMap.get(nextNorm) ?? dayTravelInfoMap.get(nextDay.date);
  const apiSegment = travelInfo?.segments?.find((s) => s.toItemId === firstNext.id);
  if (travelSegmentHasData(apiSegment)) return apiSegment!;

  const prevDay = days[fromDayIndex];
  const prevNorm = normalizeDayDate(prevDay.date);
  const prevItems =
    itineraryItemsMap.get(prevDay.date) ?? itineraryItemsMap.get(prevNorm) ?? [];
  const lastPrev = prevItems[prevItems.length - 1];

  if (
    firstNext.travelFromPreviousDuration != null ||
    firstNext.travelFromPreviousDistance != null ||
    firstNext.travelMode
  ) {
    return {
      fromItemId: lastPrev?.id ?? '',
      toItemId: firstNext.id,
      fromPlace: lastPrev?.Place?.nameCN || lastPrev?.Place?.nameEN || '上一日终点',
      toPlace: firstNext.Place?.nameCN || firstNext.Place?.nameEN || '',
      duration: firstNext.travelFromPreviousDuration ?? null,
      distance: firstNext.travelFromPreviousDistance ?? null,
      travelMode: firstNext.travelMode ?? null,
    };
  }

  return null;
}

/** 第 N 天末 → 次日凌晨住宿（退房项挂在次日列表时，交通段记在次日 travel-info） */
export function findOvernightCheckinTravelSegment(
  trip: TripDetail,
  fromDayIndex: number,
  dayTravelInfoMap: Map<string, DayTravelInfoResponse>,
  itineraryItemsMap: Map<string, ItineraryItemDetail[]>,
): TravelSegment | null {
  const days = trip.TripDay ?? [];
  if (fromDayIndex < 0 || fromDayIndex >= days.length - 1) return null;

  const nextDay = days[fromDayIndex + 1];
  const nextNorm = normalizeDayDate(nextDay.date);
  const nextItems =
    itineraryItemsMap.get(nextDay.date) ?? itineraryItemsMap.get(nextNorm) ?? [];
  const overnightItem = getOvernightStayDisplayItem(nextItems);
  if (!overnightItem) return null;

  const travelInfo = dayTravelInfoMap.get(nextNorm) ?? dayTravelInfoMap.get(nextDay.date);
  const apiSegment = travelInfo?.segments?.find((s) => s.toItemId === overnightItem.id);
  if (travelSegmentHasData(apiSegment)) return apiSegment!;

  const prevDay = days[fromDayIndex];
  const prevNorm = normalizeDayDate(prevDay.date);
  const prevItems =
    itineraryItemsMap.get(prevDay.date) ?? itineraryItemsMap.get(prevNorm) ?? [];
  const lastPrev = prevItems[prevItems.length - 1];

  if (
    overnightItem.travelFromPreviousDuration != null ||
    overnightItem.travelFromPreviousDistance != null ||
    overnightItem.travelMode
  ) {
    return {
      fromItemId: lastPrev?.id ?? '',
      toItemId: overnightItem.id,
      fromPlace: lastPrev?.Place?.nameCN || lastPrev?.Place?.nameEN || '当日终点',
      toPlace:
        overnightItem.Place?.nameCN || overnightItem.Place?.nameEN || '住宿',
      duration: overnightItem.travelFromPreviousDuration ?? null,
      distance: overnightItem.travelFromPreviousDistance ?? null,
      travelMode: overnightItem.travelMode ?? null,
    };
  }

  return null;
}

/** 退房置顶日：从 travel-info 中剔除「昨夜入住」段，避免计入今日交通汇总 */
export function adjustDayTravelSummaryExcludingOvernightCheckin(
  travelInfo: DayTravelInfoResponse | undefined,
  dayItems: ItineraryItemDetail[],
): { totalDuration: number; totalDistance: number; segmentCount: number } | undefined {
  if (!travelInfo?.summary) return undefined;
  const overnightIds = dayItems
    .filter((item) => isOvernightStayDisplayItem(item, dayItems))
    .map((item) => item.id);
  if (overnightIds.length === 0 || !travelInfo.segments?.length) return travelInfo.summary;

  const overnightSegments = travelInfo.segments.filter((s) =>
    overnightIds.includes(s.toItemId),
  );
  if (overnightSegments.length === 0) return travelInfo.summary;

  let duration = travelInfo.summary.totalDuration;
  let distance = travelInfo.summary.totalDistance;
  let count = travelInfo.summary.segmentCount;
  for (const seg of overnightSegments) {
    duration -= Number(seg.duration ?? 0);
    distance -= Number(seg.distance ?? 0);
    count -= 1;
  }
  return {
    totalDuration: Math.max(0, duration),
    totalDistance: Math.max(0, distance),
    segmentCount: Math.max(0, count),
  };
}

/** POI 增删/移动后：对指定天 POST calculate-travel 并刷新 travel-info */
export async function recalculateTripDayTravelInfoMap(
  tripId: string,
  trip: TripDetail,
  dayIds: string[],
  defaultTravelMode?: TravelMode,
): Promise<Map<string, DayTravelInfoResponse>> {
  const mode = defaultTravelMode ?? resolveItineraryDefaultTravelMode(trip);
  const uniqueDayIds = [...new Set(dayIds.filter(Boolean))];
  const map = new Map<string, DayTravelInfoResponse>();

  for (const dayId of uniqueDayIds) {
    const day = trip.TripDay?.find((d) => d.id === dayId);
    if (!day) continue;

    const travelInfo = await calculateDayTravelAndFetchInfo(tripId, dayId, mode);
    if (travelInfo?.segments?.length) {
      storeDayTravelInfo(map, day.date, travelInfo);
    }
  }

  return map;
}

/** 合并重算结果到现有 map（保留未受影响天的缓存） */
export function mergeDayTravelInfoMaps(
  base: Map<string, DayTravelInfoResponse>,
  patch: Map<string, DayTravelInfoResponse>,
  affectedDayDates: string[],
): Map<string, DayTravelInfoResponse> {
  const next = new Map(base);
  const normalizedDates = new Set(
    affectedDayDates.flatMap((d) => {
      const n = d.includes('T') ? d.split('T')[0] : d;
      return [d, n];
    }),
  );

  for (const key of normalizedDates) {
    next.delete(key);
  }

  for (const [date, info] of patch) {
    next.set(date, info);
  }

  return next;
}
