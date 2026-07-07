import { format, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatScheduleTime } from '@/lib/itinerary-item-card-format';
import type { ExecuteTodayStatusSnapshot } from '@/lib/execute-today-status.util';
import type { ExecuteResourceItem, ExecuteTransportStatusSnapshot } from '@/lib/execute-status-sidebar.util';
import type { TodayDashboardSnapshot } from '@/types/in-trip-execution';
import type { TripDetail, TripState, ScheduleResponse } from '@/types/trip';

export function formatExecuteDayHeader(dayNumber: number, date?: string): string {
  if (!date) return `Day ${dayNumber}`;
  const parsed = new Date(date.includes('T') ? date : `${date}T12:00:00`);
  if (!isValid(parsed)) return `Day ${dayNumber}`;
  return `Day ${dayNumber} · ${format(parsed, 'M月d日（EEEE）', { locale: zhCN })}`;
}

export function resolveWindWarningLabel(input: {
  alertTitle?: string | null;
  todayStatus?: ExecuteTodayStatusSnapshot | null;
}): string | undefined {
  const badge = input.todayStatus?.weatherRisks?.badges[0]?.label;
  if (badge) return `${badge}影响中`;
  if (input.alertTitle?.includes('风')) return '强风预警影响中';
  if (input.alertTitle) return input.alertTitle;
  return undefined;
}

export function resolveRouteProgressLabel(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: ScheduleResponse | null;
}): string | undefined {
  const next = input.tripState?.nextStop;
  if (!next) return undefined;

  let origin: string | undefined;
  const currentItemId = input.tripState?.currentItemId;
  if (currentItemId && input.trip?.TripDay) {
    const todayKey = input.todaySchedule?.date
      ? format(new Date(input.todaySchedule.date.includes('T') ? input.todaySchedule.date : `${input.todaySchedule.date}T12:00:00`), 'yyyy-MM-dd')
      : null;
    for (const day of input.trip.TripDay) {
      const dayKey = format(new Date(day.date.includes('T') ? day.date : `${day.date}T12:00:00`), 'yyyy-MM-dd');
      if (todayKey && dayKey !== todayKey) continue;
      const current = day.ItineraryItem?.find((item) => item.id === currentItemId);
      if (current) {
        origin = current.Place?.nameCN ?? current.Place?.nameEN ?? current.placeName ?? undefined;
        break;
      }
    }
  }

  const destination = next.Place?.nameCN ?? next.Place?.nameEN ?? next.placeName;
  if (origin && origin !== destination) return `${origin} → ${destination}`;
  return destination ? `前往 ${destination}` : undefined;
}

export interface GatheringDetails {
  time?: string;
  place?: string;
  destination?: string;
}

export function resolveGatheringDetails(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: ScheduleResponse | null;
  nextActivityLabel?: string;
}): GatheringDetails | undefined {
  const items = input.todaySchedule?.schedule?.items ?? [];
  const splitItem = items.find((item) => /集合|分流|split|group/i.test(item.placeName));
  if (splitItem) {
    const time = splitItem.startTime && isValid(new Date(splitItem.startTime))
      ? format(new Date(splitItem.startTime), 'HH:mm')
      : undefined;
    const place = splitItem.placeName.replace(/集合点|集合|分流/g, '').replace(/^[·\s]+|[·\s]+$/g, '').trim()
      || splitItem.placeName;
    const splitIdx = items.findIndex((i) => i.placeId === splitItem.placeId);
    const nextItem = splitIdx >= 0 && splitIdx + 1 < items.length ? items[splitIdx + 1] : undefined;
    return {
      time,
      place,
      destination: nextItem ? `统一前往${nextItem.placeName}` : undefined,
    };
  }

  if (!input.trip?.TripDay || !input.tripState?.currentDayId) return undefined;
  const day = input.trip.TripDay.find((d) => d.id === input.tripState?.currentDayId);
  const futureItems = day?.ItineraryItem?.slice(-2) ?? [];
  if (futureItems.length < 2) return undefined;

  const [gather, dest] = futureItems;
  const time = gather.startTime && isValid(new Date(gather.startTime))
    ? format(new Date(gather.startTime), 'HH:mm')
    : undefined;
  return {
    time,
    place: gather.Place?.nameCN ?? gather.placeName ?? undefined,
    destination: dest ? `统一前往${dest.Place?.nameCN ?? dest.placeName}` : undefined,
  };
}

export function resolveGatheringSplitNote(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: ScheduleResponse | null;
}): string | undefined {
  const items = input.todaySchedule?.schedule?.items ?? [];
  const splitItem = items.find((item) => /集合|分流|split|group/i.test(item.placeName));
  if (splitItem) {
    const time = splitItem.startTime && isValid(new Date(splitItem.startTime))
      ? format(new Date(splitItem.startTime), 'HH:mm')
      : undefined;
    return [time, splitItem.placeName].filter(Boolean).join(' · ');
  }

  const details = resolveGatheringDetails(input);
  if (!details) return undefined;
  return [details.time, details.place ? `集合点 · ${details.place}` : undefined].filter(Boolean).join(' · ');
}

export interface ExecuteTimelineScheduleItem {
  placeId?: number;
  placeName: string;
  startTime?: string;
  type?: string;
}

export interface ExecuteTimelineRailSnapshot {
  current: {
    routeLabel: string;
    arrivalEta?: string;
    isPlaceholder?: boolean;
  };
  next: {
    activityLabel: string;
    startTimeLabel?: string;
    statusLabel: string;
    isPlaceholder?: boolean;
  };
  gathering: {
    time?: string;
    place?: string;
    destination?: string;
    isPlaceholder?: boolean;
  };
}

/** 冰岛执行页 · 地图左侧时间轴演示数据（后端 tripState 为空时） */
export const ICELAND_DEMO_TIMELINE_RAIL: ExecuteTimelineRailSnapshot = {
  current: {
    routeLabel: '丁基达尔斯 → 冰川营地',
    arrivalEta: '12:05',
    isPlaceholder: false,
  },
  next: {
    activityLabel: '冰川徒步体验',
    startTimeLabel: '12:30',
    statusLabel: '待确认',
    isPlaceholder: false,
  },
  gathering: {
    time: '16:30',
    place: '丁基达尔斯村',
    destination: '统一前往布迪尔温泉',
    isPlaceholder: false,
  },
};

function applyDemoTimelineRailFallback(snapshot: ExecuteTimelineRailSnapshot): ExecuteTimelineRailSnapshot {
  const demo = ICELAND_DEMO_TIMELINE_RAIL;
  return {
    current: snapshot.current.isPlaceholder ? demo.current : snapshot.current,
    next: snapshot.next.isPlaceholder ? demo.next : snapshot.next,
    gathering: snapshot.gathering.isPlaceholder ? demo.gathering : snapshot.gathering,
  };
}

function collectTimelineScheduleItems(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: ScheduleResponse | null;
  inTripToday?: TodayDashboardSnapshot | null;
}): ExecuteTimelineScheduleItem[] {
  const scheduleItems = input.todaySchedule?.schedule?.items ?? [];
  if (scheduleItems.length > 0) {
    return scheduleItems.map((item) => ({
      placeId: item.placeId,
      placeName: item.placeName,
      startTime: item.startTime,
      type: item.type,
    }));
  }

  const currentDay = input.trip?.TripDay?.find((day) => day.id === input.tripState?.currentDayId);
  const dayItems = currentDay?.ItineraryItem ?? [];
  if (dayItems.length > 0) {
    return dayItems.map((item) => ({
      placeId: item.placeId ?? undefined,
      placeName: item.Place?.nameCN ?? item.Place?.nameEN ?? item.placeName ?? '行程点',
      startTime: item.startTime,
      type: item.type,
    }));
  }

  const planned = input.inTripToday?.timeline?.planned ?? [];
  if (planned.length > 0) {
    return planned.map((item) => ({
      placeName: item.title,
      startTime: item.startTime,
      type: item.type,
    }));
  }

  return [];
}

function findNextStopIndex(
  items: ExecuteTimelineScheduleItem[],
  tripState?: TripState | null,
): number {
  if (tripState?.nextStop?.placeId != null) {
    const idx = items.findIndex((item) => item.placeId === tripState.nextStop?.placeId);
    if (idx >= 0) return idx;
  }
  if (tripState?.nextStop?.placeName) {
    const idx = items.findIndex((item) => item.placeName === tripState.nextStop?.placeName);
    if (idx >= 0) return idx;
  }
  return items.length > 1 ? 1 : 0;
}

function findActivityAfterIndex(
  items: ExecuteTimelineScheduleItem[],
  fromIndex: number,
): ExecuteTimelineScheduleItem | undefined {
  for (let i = fromIndex + 1; i < items.length; i += 1) {
    const item = items[i];
    if (/集合|分流|split|group/i.test(item.placeName)) continue;
    if (/驾驶|交通|transfer|drive|transit/i.test(`${item.placeName} ${item.type ?? ''}`)) continue;
    return item;
  }
  return undefined;
}

/** 左侧时间轴三栏：始终返回完整结构，避免后端空状态时 UI 空白 */
export function resolveExecuteTimelineRail(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: ScheduleResponse | null;
  inTripToday?: TodayDashboardSnapshot | null;
  arrivalEta?: string;
  resources?: ExecuteResourceItem[];
  transport?: ExecuteTransportStatusSnapshot;
}): ExecuteTimelineRailSnapshot {
  const items = collectTimelineScheduleItems(input);
  const nextIdx = findNextStopIndex(items, input.tripState);
  const routeProgressLabel = resolveRouteProgressLabel({
    trip: input.trip,
    tripState: input.tripState,
    todaySchedule: input.todaySchedule,
  });

  let currentRoute = routeProgressLabel;
  if (!currentRoute && items.length >= 2) {
    currentRoute = `${items[Math.max(0, nextIdx - 1)].placeName} → ${items[nextIdx].placeName}`;
  } else if (!currentRoute && items.length === 1) {
    currentRoute = `前往 ${items[0].placeName}`;
  } else if (!currentRoute && input.transport?.arrivalPlaceLabel) {
    currentRoute = `前往 ${input.transport.arrivalPlaceLabel}`;
  }

  const nextScheduleItem =
    findActivityAfterIndex(items, nextIdx) ?? items[nextIdx + 1];

  let nextLabel: string | undefined = nextScheduleItem?.placeName;
  let nextTime = nextScheduleItem?.startTime
    ? formatScheduleTime(nextScheduleItem.startTime)
    : undefined;
  let nextStatus = nextScheduleItem
    ? input.resources?.find((resource) => resource.title === nextScheduleItem.placeName)?.statusLabel
    : undefined;

  if (!nextLabel) {
    const fallbackActivity = input.resources?.find(
      (resource) => resource.category === 'activity' && resource.statusLabel !== '进行中',
    ) ?? input.resources?.find((resource) => resource.category === 'activity');
    nextLabel = fallbackActivity?.title;
    nextStatus = fallbackActivity?.statusLabel ?? nextStatus;
  }

  const gatheringDetails = resolveGatheringDetails({
    trip: input.trip,
    tripState: input.tripState,
    todaySchedule: input.todaySchedule,
    nextActivityLabel: nextLabel,
  });

  let gathering = gatheringDetails ?? {};
  if (!gathering.time && !gathering.place && !gathering.destination && items.length >= 2) {
    const tail = items[items.length - 1];
    const meet = items[items.length - 2];
    if (/集合|村|camp|营地|village/i.test(meet.placeName) || meet.startTime) {
      gathering = {
        time: meet.startTime && isValid(new Date(meet.startTime))
          ? format(new Date(meet.startTime), 'HH:mm')
          : undefined,
        place: meet.placeName.replace(/集合点|集合/g, '').trim() || meet.placeName,
        destination: tail ? `统一前往${tail.placeName}` : undefined,
      };
    }
  }

  return applyDemoTimelineRailFallback({
    current: {
      routeLabel: currentRoute ?? '当前路段待同步',
      arrivalEta: input.arrivalEta ?? input.transport?.arrivalTime,
      isPlaceholder: !currentRoute,
    },
    next: {
      activityLabel: nextLabel ?? '下一项活动待确认',
      startTimeLabel: nextTime,
      statusLabel: nextStatus ?? '待确认',
      isPlaceholder: !nextLabel,
    },
    gathering: {
      time: gathering.time,
      place: gathering.place,
      destination: gathering.destination,
      isPlaceholder: !gathering.time && !gathering.place && !gathering.destination,
    },
  });
}
