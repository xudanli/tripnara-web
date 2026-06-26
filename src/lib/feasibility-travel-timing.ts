import { DateTime } from 'luxon';
import type { ItineraryItemDetail, TripDetail, TravelSegment } from '@/types/trip';
import type {
  FeasibilityIssueDto,
  FeasibilityIssueAnchorsDto,
} from '@/types/trip-feasibility-report';
import { analyzeDayOneDepartureTiming } from '@/lib/day-one-arrival';
import { analyzeInterDayTravelTiming } from '@/lib/inter-day-travel';
import { travelSegmentHasData } from '@/lib/itinerary-travel-info';
import { resolveDestinationTimezone } from '@/utils/timezone';
import {
  getCheckoutMorningTravelPair,
  isAccommodationItineraryItem,
  isOvernightStayDisplayItem,
  sortItineraryItemsByTimeline,
} from '@/lib/itinerary-item-sort';
import {
  getCarRentalDisplayLabel,
  isCarRentalItineraryItem,
  resolveCarRentalPickupAnchor,
} from '@/lib/trip-car-rental-status';
import { isExplicitSelfDriveTrip, isSelfDrivePlanningTrip } from '@/lib/trip-self-drive';
import type { PlanStudioScheduleNavigateDetail } from '@/lib/plan-studio-schedule-navigation';
import { parseTravelRouteFromMessage } from '@/lib/feasibility-travel-route-parse';
import { isUltraLongDriveIssue } from '@/lib/feasibility-ultra-long-drive';

export { parseTravelRouteFromMessage } from '@/lib/feasibility-travel-route-parse';
export {
  isUltraLongDriveIssue,
  ULTRA_LONG_DRIVE_DISTANCE_METERS,
} from '@/lib/feasibility-ultra-long-drive';

export interface FeasibilityTravelTimingViewModel {
  fromPlaceLabel: string;
  toPlaceLabel: string;
  fromItemId?: string;
  toItemId?: string;
  fromDayNumber: number;
  toDayNumber: number;
  travelMinutes: number;
  travelDistanceMeters?: number;
  travelDistanceLabel?: string;
  departAtLabel?: string;
  arriveAtLabel?: string;
  activityStartLabel?: string;
  gapMinutes?: number;
  isStartTooEarly?: boolean;
  suggestedTimeLabel?: string;
  shortfallMinutes?: number;
  /** 出发锚点：退房 / 取车 / 普通出发 */
  departAnchorKind?: 'checkout' | 'car_pickup' | 'depart';
  timingSource: 'anchors' | 'computed' | 'parsed_only';
  statusMessage: string;
  statusTone: 'ok' | 'tight' | 'too_early' | 'missing_times';
  timezone: string;
}

function formatHmFromIso(iso: string, timezone: string): string {
  const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone(timezone);
  return dt.isValid ? dt.toFormat('HH:mm') : '--:--';
}

function formatTravelMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

export function formatTravelMinutesLabel(minutes: number): string {
  return formatTravelMinutes(minutes);
}

function formatDistance(meters?: number): string | undefined {
  if (!meters || meters <= 0) return undefined;
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(0)} km`;
}

export function formatTravelDistanceLabel(meters?: number): string | undefined {
  return formatDistance(meters);
}

/** 粗略自驾耗时：约 50 km/h → 每公里约 1.2 分钟 */
function estimateDriveMinutesFromDistanceMeters(meters: number): number {
  return Math.max(1, Math.round((meters / 1000) * 1.2));
}

/** 距离与耗时明显不匹配（如 300+ km 却不到 1 小时） */
function isImplausibleTravelDuration(distanceMeters: number, durationMinutes: number): boolean {
  if (distanceMeters < 50000 || durationMinutes <= 0) return false;
  const minPlausibleMinutes = Math.round((distanceMeters / 1000) * 0.5);
  return durationMinutes < minPlausibleMinutes;
}

function toItemImmediatelyFollowsFrom(
  fromItem: ItineraryItemDetail,
  toItem: ItineraryItemDetail,
  timelineItems: ItineraryItemDetail[],
): boolean {
  const sorted = sortItineraryItemsByTimeline(timelineItems);
  const fromIdx = sorted.findIndex((item) => item.id === fromItem.id);
  const toIdx = sorted.findIndex((item) => item.id === toItem.id);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1;
}

function resolveTravelDurationMinutes(input: {
  explicitDuration?: number | null;
  distanceMeters?: number | null;
  fromItem?: ItineraryItemDetail;
  toItem?: ItineraryItemDetail;
  timelineItems?: ItineraryItemDetail[];
}): number {
  const { explicitDuration, distanceMeters, fromItem, toItem, timelineItems } = input;
  const follows =
    fromItem &&
    toItem &&
    timelineItems &&
    toItemImmediatelyFollowsFrom(fromItem, toItem, timelineItems);

  let duration =
    explicitDuration != null && explicitDuration > 0
      ? explicitDuration
      : follows && toItem!.travelFromPreviousDuration != null
        ? toItem!.travelFromPreviousDuration
        : null;

  if (
    distanceMeters &&
    duration != null &&
    isImplausibleTravelDuration(distanceMeters, duration)
  ) {
    duration = estimateDriveMinutesFromDistanceMeters(distanceMeters);
  } else if (duration == null && distanceMeters) {
    duration = estimateDriveMinutesFromDistanceMeters(distanceMeters);
  }

  return duration ?? 0;
}

export function resolveAnchorsTravelMinutes(anchors: FeasibilityIssueAnchorsDto): number {
  return resolveTravelDurationMinutes({
    explicitDuration: anchors.travelMinutes,
    distanceMeters: anchors.travelDistanceMeters,
  });
}

function resolveTravelDistanceMeters(input: {
  explicitDistance?: number | null;
  parsedDistanceMeters?: number;
  fromItem?: ItineraryItemDetail;
  toItem?: ItineraryItemDetail;
  timelineItems?: ItineraryItemDetail[];
}): number | undefined {
  const { explicitDistance, parsedDistanceMeters, fromItem, toItem, timelineItems } = input;
  if (parsedDistanceMeters) return parsedDistanceMeters;
  if (explicitDistance != null && explicitDistance > 0) return explicitDistance;

  const follows =
    fromItem &&
    toItem &&
    timelineItems &&
    toItemImmediatelyFollowsFrom(fromItem, toItem, timelineItems);
  if (follows && toItem!.travelFromPreviousDistance != null) {
    return toItem!.travelFromPreviousDistance;
  }
  return undefined;
}


export function isInterDayTravelIssue(issue: FeasibilityIssueDto): boolean {
  if (issue.issueKind === 'inter_day_travel' || issue.issueKind === 'same_day_travel') {
    return true;
  }
  const parsed = parseTravelRouteFromMessage(issue.message);
  const text = `${issue.message} ${issue.actionRequired ?? ''}`;
  if (parsed) return true;
  return /跨天/.test(text) && /→|->/.test(issue.message);
}

function applyUltraLongDriveViewHints(
  issue: FeasibilityIssueDto,
  view: FeasibilityTravelTimingViewModel,
): FeasibilityTravelTimingViewModel {
  if (!isUltraLongDriveIssue(issue, view)) return view;
  if (view.statusTone === 'too_early' || view.statusTone === 'missing_times') return view;

  const distLabel = view.travelDistanceLabel ?? '过长';
  const driveLabel =
    view.travelMinutes > 0 ? formatTravelMinutes(view.travelMinutes) : '较长';
  return {
    ...view,
    statusTone: 'tight',
    statusMessage: `单日驾驶约 ${distLabel}（路上约 ${driveLabel}）。时间或许能衔接，但不宜仅靠改时间解决，建议拆成两天或中途住宿。`,
  };
}

function placeLabelMatches(item: ItineraryItemDetail, label: string): boolean {
  const needle = label.trim().toLowerCase();
  if (!needle) return false;
  const candidates = [
    item.Place?.nameCN,
    item.Place?.nameEN,
    item.note,
  ].filter(Boolean) as string[];
  return candidates.some(
    (c) => c.toLowerCase().includes(needle) || needle.includes(c.toLowerCase()),
  );
}

export function findItineraryItemsForTravelLabels(
  items: ItineraryItemDetail[],
  fromLabel: string,
  toLabel: string,
): { fromItem?: ItineraryItemDetail; toItem?: ItineraryItemDetail } {
  const fromItem = items.find((item) => placeLabelMatches(item, fromLabel));
  const toItem = items.find((item) => placeLabelMatches(item, toLabel));
  return { fromItem, toItem };
}

export function resolveTravelItemIdsFromTrip(
  trip: TripDetail,
  fromLabel: string,
  toLabel: string,
  dayNumber?: number,
): string[] {
  const days = trip.TripDay ?? [];
  const searchDayIndices =
    typeof dayNumber === 'number' && dayNumber >= 1
      ? [dayNumber - 1, dayNumber]
      : days.map((_, i) => i);

  for (const dayIdx of searchDayIndices) {
    const day = days[dayIdx];
    if (!day) continue;
    const items = sortItineraryItemsByTimeline(day.ItineraryItem ?? []) as ItineraryItemDetail[];
    const { fromItem, toItem } = findItineraryItemsForTravelLabels(items, fromLabel, toLabel);
    const ids = [fromItem?.id, toItem?.id].filter(Boolean) as string[];
    if (ids.length > 0) return ids;
  }

  for (const day of days) {
    const items = sortItineraryItemsByTimeline(day.ItineraryItem ?? []) as ItineraryItemDetail[];
    const { fromItem, toItem } = findItineraryItemsForTravelLabels(items, fromLabel, toLabel);
    const ids = [fromItem?.id, toItem?.id].filter(Boolean) as string[];
    if (ids.length > 0) return ids;
  }
  return [];
}

function anchorIso(
  anchors: FeasibilityIssueAnchorsDto,
  kind: 'depart' | 'arrive' | 'start' | 'suggested',
): string | undefined {
  switch (kind) {
    case 'depart':
      return anchors.departAt ?? anchors.fromTime;
    case 'arrive':
      return anchors.arriveAt;
    case 'start':
      return anchors.activityStartAt ?? anchors.toTime;
    case 'suggested':
      return anchors.suggestedTime;
  }
}

function viewFromAnchors(
  anchors: FeasibilityIssueAnchorsDto,
  timezone: string,
): FeasibilityTravelTimingViewModel {
  const gapMinutes = anchors.gapMinutes;
  const shortfallMinutes =
    anchors.shortfallMinutes ??
    (gapMinutes != null && gapMinutes < 0 ? Math.abs(Math.round(gapMinutes)) : undefined);
  const isStartTooEarly =
    anchors.isStartTooEarly ?? (gapMinutes != null && gapMinutes < -5);
  const departIso = anchorIso(anchors, 'depart');
  const arriveIso = anchorIso(anchors, 'arrive');
  const startIso = anchorIso(anchors, 'start');
  const suggestedIso = anchorIso(anchors, 'suggested');

  const travelMinutes = resolveTravelDurationMinutes({
    explicitDuration: anchors.travelMinutes,
    distanceMeters: anchors.travelDistanceMeters,
  });

  const statusTone: FeasibilityTravelTimingViewModel['statusTone'] =
    anchors.timingSource === 'missing_times' || !departIso || !startIso
      ? 'missing_times'
      : isStartTooEarly
        ? 'too_early'
        : gapMinutes != null && gapMinutes <= 30
          ? 'tight'
          : 'ok';

  let statusMessage = '请确认退房与下一站开始时间是否衔接合理。';
  if (statusTone === 'missing_times') {
    statusMessage = '尚未填写完整时间，请补全退房或下一站开始时间。';
  } else if (statusTone === 'too_early') {
    const shortfall = shortfallMinutes ?? Math.abs(Math.round(gapMinutes ?? 0));
    statusMessage = `按当前时间，路上约需 ${formatTravelMinutes(travelMinutes)}，首项开始偏早（差约 ${shortfall} 分钟）。`;
    if (suggestedIso) {
      statusMessage += ` 建议开始时间 ${formatHmFromIso(suggestedIso, timezone)}。`;
    }
  } else if (statusTone === 'tight') {
    statusMessage = `路上约 ${formatTravelMinutes(travelMinutes)}，抵达后缓冲较短，建议核对出发时刻。`;
  } else if (departIso && arriveIso && gapMinutes != null) {
    statusMessage = `若 ${formatHmFromIso(departIso, timezone)} 出发，约 ${formatHmFromIso(arriveIso, timezone)} 抵达，距开始还有约 ${Math.round(gapMinutes)} 分钟。`;
  }

  return {
    fromPlaceLabel: anchors.fromPlaceLabel,
    toPlaceLabel: anchors.toPlaceLabel,
    fromItemId: anchors.fromItemId,
    toItemId: anchors.toItemId,
    fromDayNumber: anchors.fromDayNumber,
    toDayNumber: anchors.toDayNumber,
    travelMinutes,
    travelDistanceMeters: anchors.travelDistanceMeters,
    travelDistanceLabel: formatDistance(anchors.travelDistanceMeters),
    departAtLabel: departIso ? formatHmFromIso(departIso, timezone) : undefined,
    arriveAtLabel: arriveIso ? formatHmFromIso(arriveIso, timezone) : undefined,
    activityStartLabel: startIso ? formatHmFromIso(startIso, timezone) : undefined,
    suggestedTimeLabel: suggestedIso ? formatHmFromIso(suggestedIso, timezone) : undefined,
    gapMinutes,
    shortfallMinutes,
    isStartTooEarly,
    timingSource: 'anchors',
    statusMessage,
    statusTone,
    timezone,
  };
}

export type TravelTimingDepartAnchorKind = 'checkout' | 'car_pickup' | 'depart';

function isSelfDriveTrip(trip: TripDetail | null | undefined): boolean {
  return isSelfDrivePlanningTrip(trip) || isExplicitSelfDriveTrip(trip);
}

/** 自驾行程：优先用租车取车时刻作为出发锚点 */
function resolveDepartureAnchorForTiming(
  fromItem: ItineraryItemDetail,
  toItem: ItineraryItemDetail,
  dayItems: ItineraryItemDetail[],
  trip: TripDetail | null | undefined,
  fromDayNumber: number,
): { departItem: ItineraryItemDetail; anchorKind: TravelTimingDepartAnchorKind } {
  const rental = resolveCarRentalPickupAnchor(dayItems, toItem);
  if (isSelfDriveTrip(trip) && rental) {
    const shouldUseRental =
      fromDayNumber === 1 ||
      isAccommodationItineraryItem(fromItem) ||
      isOvernightStayDisplayItem(fromItem) ||
      isCarRentalItineraryItem(fromItem);
    if (shouldUseRental) {
      return { departItem: rental as ItineraryItemDetail, anchorKind: 'car_pickup' };
    }
  }

  if (isOvernightStayDisplayItem(fromItem)) {
    return { departItem: fromItem, anchorKind: 'checkout' };
  }

  return { departItem: fromItem, anchorKind: 'depart' };
}

/** 取车锚点用 startTime，退房等锚点用 endTime */
function itemForDepartureTiming(
  item: ItineraryItemDetail,
  anchorKind: TravelTimingDepartAnchorKind,
): ItineraryItemDetail {
  if (anchorKind === 'car_pickup' && item.startTime) {
    return { ...item, endTime: item.startTime };
  }
  return item;
}

function inferTimingFromItems(
  fromItem: ItineraryItemDetail,
  toItem: ItineraryItemDetail,
  segment: TravelSegment | null,
  fromDayNumber: number,
  _toDayNumber: number,
  timezone: string,
  anchorKind: TravelTimingDepartAnchorKind = 'depart',
  timelineItems?: ItineraryItemDetail[],
  parsedDistanceMeters?: number,
): Pick<
  FeasibilityTravelTimingViewModel,
  | 'departAtLabel'
  | 'arriveAtLabel'
  | 'activityStartLabel'
  | 'gapMinutes'
  | 'isStartTooEarly'
  | 'statusMessage'
  | 'statusTone'
  | 'travelMinutes'
  | 'departAnchorKind'
> {
  const distanceMeters = resolveTravelDistanceMeters({
    explicitDistance: segment?.distance,
    parsedDistanceMeters,
    fromItem,
    toItem,
    timelineItems,
  });
  const travelMinutes = resolveTravelDurationMinutes({
    explicitDuration: segment?.duration,
    distanceMeters,
    fromItem,
    toItem,
    timelineItems,
  });
  const effectiveSegment: TravelSegment | null =
    segment && travelSegmentHasData(segment)
      ? {
          ...segment,
          duration: travelMinutes,
          distance: distanceMeters ?? segment.distance,
        }
      : travelMinutes > 0 || distanceMeters
        ? {
            fromItemId: fromItem.id,
            toItemId: toItem.id,
            fromPlace:
              segment?.fromPlace ??
              fromItem.Place?.nameCN ??
              fromItem.Place?.nameEN ??
              '起点',
            toPlace:
              segment?.toPlace ??
              toItem.Place?.nameCN ??
              toItem.Place?.nameEN ??
              '终点',
            duration: travelMinutes,
            distance: distanceMeters ?? null,
            travelMode: segment?.travelMode ?? toItem.travelMode ?? null,
          }
        : null;

  const checkoutPair =
    anchorKind === 'checkout' &&
    getCheckoutMorningTravelPair([fromItem, toItem].length > 1 ? [fromItem, toItem] : []);
  if (checkoutPair && travelSegmentHasData(effectiveSegment)) {
    const timing = analyzeDayOneDepartureTiming(
      effectiveSegment!,
      checkoutPair.overnightItem,
      checkoutPair.nextActivityItem,
      timezone,
    );
    if (timing) {
      return {
        travelMinutes: timing.travelMinutes,
        departAtLabel: timing.suggestedDepartLabel.match(/\d{2}:\d{2}/)?.[0],
        arriveAtLabel: timing.earliestArrivalLabel.match(/\d{2}:\d{2}/)?.[0],
        activityStartLabel: timing.firstActivityStartLabel ?? undefined,
        gapMinutes: timing.gapMinutes,
        isStartTooEarly: timing.isStartTooEarly,
        statusMessage: timing.message,
        departAnchorKind: 'checkout',
        statusTone: timing.isStartTooEarly
          ? 'too_early'
          : timing.gapMinutes <= 30
            ? 'tight'
            : !fromItem.endTime || !toItem.startTime
              ? 'missing_times'
              : 'ok',
      };
    }
  }

  if (travelSegmentHasData(effectiveSegment)) {
    const timing =
      anchorKind === 'car_pickup' || fromDayNumber === 1
        ? analyzeDayOneDepartureTiming(effectiveSegment!, fromItem, toItem, timezone)
        : analyzeInterDayTravelTiming(effectiveSegment!, fromDayNumber, fromItem, toItem, timezone);
    if (timing) {
      const missingTimes =
        anchorKind === 'car_pickup'
          ? !fromItem.startTime || !toItem.startTime
          : !fromItem.endTime || !toItem.startTime;
      return {
        travelMinutes: timing.travelMinutes,
        departAtLabel: timing.suggestedDepartLabel.match(/\d{2}:\d{2}/)?.[0],
        arriveAtLabel: timing.earliestArrivalLabel.match(/\d{2}:\d{2}/)?.[0],
        activityStartLabel: timing.firstActivityStartLabel ?? undefined,
        gapMinutes: timing.gapMinutes,
        isStartTooEarly: timing.isStartTooEarly,
        statusMessage: timing.message,
        departAnchorKind: anchorKind,
        statusTone: timing.isStartTooEarly
          ? 'too_early'
          : timing.gapMinutes <= 30
            ? 'tight'
            : missingTimes
              ? 'missing_times'
              : 'ok',
      };
    }
  }

  const missingTimesFallback =
    anchorKind === 'car_pickup'
      ? !fromItem.startTime || !toItem.startTime
      : !fromItem.endTime || !toItem.startTime;

  return {
    travelMinutes,
    departAnchorKind: anchorKind,
    statusMessage:
      travelMinutes > 0
        ? `今日请预留约 ${formatTravelMinutes(travelMinutes)} 的交通（${fromItem.Place?.nameCN ?? '起点'} → ${toItem.Place?.nameCN ?? '终点'}）。`
        : anchorKind === 'car_pickup'
          ? '请补全取车时间与下一站开始时间，并核对路上耗时。'
          : '请补全退房与下一站开始时间，并核对跨天交通是否已写入行程。',
    statusTone: missingTimesFallback ? 'missing_times' : 'ok',
  };
}

export function buildTravelTimingViewModel(input: {
  issue: FeasibilityIssueDto;
  dayNumber?: number;
  trip?: TripDetail | null;
  dayItems?: ItineraryItemDetail[];
  nextDayItems?: ItineraryItemDetail[];
  segment?: TravelSegment | null;
  timezone?: string;
}): FeasibilityTravelTimingViewModel | null {
  const { issue, trip, dayItems, nextDayItems, segment } = input;
  if (!isInterDayTravelIssue(issue)) return null;

  const timezone = input.timezone ?? resolveDestinationTimezone(trip?.destination) ?? 'UTC';
  const dayNumber =
    input.dayNumber ??
    issue.affectedDays?.[0] ??
    parseTravelRouteFromMessage(issue.message)?.dayNumber ??
    1;

  if (issue.anchors) {
    return applyUltraLongDriveViewHints(issue, viewFromAnchors(issue.anchors, timezone));
  }

  const parsed = parseTravelRouteFromMessage(issue.message);
  if (!parsed) {
    if (!/跨天/.test(issue.message) || !/→|->/.test(issue.message)) return null;
    return {
      fromPlaceLabel: '出发地',
      toPlaceLabel: '目的地',
      fromDayNumber: dayNumber,
      toDayNumber: dayNumber,
      travelMinutes: 0,
      timingSource: 'parsed_only',
      statusMessage: issue.message,
      statusTone: 'missing_times',
      timezone,
    };
  }

  const allItems = [...(dayItems ?? []), ...(nextDayItems ?? [])];
  const { fromItem, toItem } = findItineraryItemsForTravelLabels(
    allItems,
    parsed.fromPlaceLabel,
    parsed.toPlaceLabel,
  );

  const resolvedSegmentRaw =
    segment ??
    (fromItem && toItem
      ? {
          fromItemId: fromItem.id,
          toItemId: toItem.id,
          fromPlace: parsed.fromPlaceLabel,
          toPlace: parsed.toPlaceLabel,
          duration: null,
          distance: parsed.distanceMeters ?? null,
          travelMode: toItem.travelMode ?? fromItem.travelMode ?? null,
        }
      : null);

  const resolvedDistance = resolveTravelDistanceMeters({
    explicitDistance: resolvedSegmentRaw?.distance,
    parsedDistanceMeters: parsed.distanceMeters,
    fromItem,
    toItem,
    timelineItems: allItems,
  });

  const travelMinutes = resolveTravelDurationMinutes({
    explicitDuration: resolvedSegmentRaw?.duration,
    distanceMeters: resolvedDistance,
    fromItem,
    toItem,
    timelineItems: allItems,
  });

  const resolvedSegment =
    resolvedSegmentRaw &&
    (travelSegmentHasData(resolvedSegmentRaw) || travelMinutes > 0 || resolvedDistance)
      ? {
          ...resolvedSegmentRaw,
          duration: travelMinutes,
          distance: resolvedDistance ?? resolvedSegmentRaw.distance,
        }
      : null;

  const base: FeasibilityTravelTimingViewModel = {
    fromPlaceLabel: parsed.fromPlaceLabel,
    toPlaceLabel: parsed.toPlaceLabel,
    fromItemId: fromItem?.id,
    toItemId: toItem?.id,
    fromDayNumber: dayNumber,
    toDayNumber: dayNumber,
    travelMinutes,
    travelDistanceMeters: resolvedDistance ?? resolvedSegment?.distance ?? undefined,
    travelDistanceLabel: formatDistance(resolvedDistance ?? resolvedSegment?.distance ?? undefined),
    timingSource: fromItem && toItem ? 'computed' : 'parsed_only',
    statusMessage: '请到时间轴核对退房、路上耗时与下一站开始时间是否衔接。',
    statusTone: 'missing_times',
    timezone,
  };

  if (fromItem && toItem) {
    const dayOnlyItems = (dayItems ?? allItems) as ItineraryItemDetail[];
    const { departItem, anchorKind } = resolveDepartureAnchorForTiming(
      fromItem,
      toItem,
      dayOnlyItems,
      trip,
      dayNumber,
    );
    const departForTiming = itemForDepartureTiming(departItem, anchorKind);
    const inferred = inferTimingFromItems(
      departForTiming,
      toItem,
      resolvedSegment,
      dayNumber,
      dayNumber,
      timezone,
      anchorKind,
      allItems,
      parsed.distanceMeters,
    );
    const fromPlaceLabel =
      anchorKind === 'car_pickup' ? getCarRentalDisplayLabel(departItem) : base.fromPlaceLabel;
    return applyUltraLongDriveViewHints(issue, {
      ...base,
      ...inferred,
      fromPlaceLabel,
      fromItemId: departItem.id,
      timingSource: 'computed',
    });
  }

  return applyUltraLongDriveViewHints(issue, base);
}

export function buildScheduleNavigateDetail(
  issue: FeasibilityIssueDto,
  view: FeasibilityTravelTimingViewModel,
  trip?: TripDetail | null,
): PlanStudioScheduleNavigateDetail {
  const uiDeepLink = issue.uiHints?.deepLink;
  const highlightItemIds =
    uiDeepLink?.highlightItemIds ??
    [view.fromItemId, view.toItemId].filter(Boolean) as string[];

  if (highlightItemIds.length === 0 && trip) {
    const resolved = resolveTravelItemIdsFromTrip(
      trip,
      view.fromPlaceLabel,
      view.toPlaceLabel,
      view.fromDayNumber,
    );
    if (resolved.length > 0) {
      return {
        dayNumber: view.fromDayNumber,
        dayIndex: uiDeepLink?.dayIndex ?? view.fromDayNumber - 1,
        highlightItemIds: resolved,
        focus: 'travel-timing',
        issueId: issue.id,
        fromPlaceLabel: view.fromPlaceLabel,
        toPlaceLabel: view.toPlaceLabel,
      };
    }
  }

  return {
    dayNumber: view.toDayNumber ?? view.fromDayNumber,
    dayIndex: uiDeepLink?.dayIndex ?? (view.toDayNumber ?? view.fromDayNumber) - 1,
    highlightItemIds,
    focus: 'travel-timing',
    issueId: issue.id,
    fromPlaceLabel: view.fromPlaceLabel,
    toPlaceLabel: view.toPlaceLabel,
  };
}

export function hmToIsoOnDay(
  dayDate: string,
  hm: string,
  timezone: string,
): string | null {
  const [h, m] = hm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const datePart = dayDate.includes('T') ? dayDate.split('T')[0] : dayDate;
  const dt = DateTime.fromISO(`${datePart}T00:00:00`, { zone: timezone }).set({
    hour: h,
    minute: m,
    second: 0,
    millisecond: 0,
  });
  return dt.isValid ? dt.toUTC().toISO() : null;
}

export function computeArriveHm(departHm: string, travelMinutes: number): string {
  const [h, m] = departHm.split(':').map(Number);
  const total = h * 60 + m + travelMinutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function computeGapMinutes(
  departHm: string,
  activityStartHm: string,
  travelMinutes: number,
): number {
  const [dh, dm] = departHm.split(':').map(Number);
  const [sh, sm] = activityStartHm.split(':').map(Number);
  const departTotal = dh * 60 + dm + travelMinutes;
  const startTotal = sh * 60 + sm;
  return startTotal - departTotal;
}
