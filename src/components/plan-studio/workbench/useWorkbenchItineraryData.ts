import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import { loadTripDayTravelInfoMapCached } from '@/lib/itinerary-travel-info';
import {
  applyScheduleTimelineToMaps,
  isScheduleTimelineUnavailable,
} from '@/lib/schedule-timeline-apply';
import {
  sortItineraryItemsForDisplay,
  isAccommodationItineraryItem,
  itemSpansOvernight,
  filterCheckoutDayTimelineItems,
  getOvernightItemsForPriorDayTimeline,
  getCarRentalReturnItemsForDayTimeline,
} from '@/lib/itinerary-item-sort';
import { extractHmFromWindow, formatItineraryItemTimeRangeLabel } from '@/lib/itinerary-item-card-format';
import { getItineraryItemTypeDisplay, isItineraryItemType } from '@/lib/itinerary-item-type-display';
import { collectPlaceImages } from '@/lib/collect-place-images';
import { getItineraryItemTimelineTypeBadge } from '@/lib/itinerary-item-type-display';
import { travelSegmentHasData } from '@/lib/itinerary-travel-info';
import { resolveDestinationTimezone } from '@/utils/timezone';
import type {
  DayMetricsResponse,
  DayTravelInfoResponse,
  ItineraryItemDetail,
  ItineraryItemType,
  TravelSegment,
  TripDetail,
} from '@/types/trip';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { LucideIcon } from 'lucide-react';
import { Car, ShoppingBag, User } from 'lucide-react';
import {
  formatItinerarySplitGroupLabel,
  itinerarySplitPhaseLabel,
  parseItinerarySplitPlanNote,
  stripSplitPlanNoteLines,
} from '@/lib/itinerary-split-note.util';
import { readDailyDriveLimitHours } from '@/lib/daily-drive-conflict.util';
import {
  formatWorkbenchDistanceKm,
  formatWorkbenchDurationMinutes,
  resolveWorkbenchTimelineItemTitle,
  routeStopsFromTrip,
  shouldShowWorkbenchSplitGroupLabel,
} from './workbench-format.util';

export interface WorkbenchTimelineEntryDetail {
  description?: string;
  phone?: string;
  website?: string;
  tags?: string[];
}

export interface WorkbenchTimelineEntry {
  id: string;
  timeLabel: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  highlight?: boolean;
  /** 已应用分流后 ItineraryItem.note 解析出的分组标签 */
  splitGroupLabel?: string;
  splitPhaseLabel?: string;
  typeLabel?: string;
  typeEmoji?: string;
  imageUrl?: string;
  address?: string;
  isLodging?: boolean;
  /** POI 简介与联系信息，用于时间轴内联展开 */
  detail?: WorkbenchTimelineEntryDetail;
  /** 到达本项前的交通段 */
  travelSegmentBefore?: TravelSegment;
}

export interface WorkbenchConflictLine {
  id: string;
  icon: LucideIcon;
  /** 短标题（如「交通缓冲偏紧」） */
  label: string;
  /** 补充说明（如距离/时长） */
  detail?: string;
  severity?: 'hard' | 'soft';
  delta?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface WorkbenchRouteStats {
  totalDistanceKm: number;
  totalDriveMinutes: number;
  avgDailyDriveMinutes: number;
  overtimeMinutes: number;
  dailyDriveLimitMinutes: number;
}

export interface WorkbenchDaySnapshot {
  dayIndex: number;
  dayNumber: number;
  dateLabel: string;
  weekdayLabel: string;
  executable: boolean;
  timeline: WorkbenchTimelineEntry[];
  conflictLines: WorkbenchConflictLine[];
  dayDriveMinutes: number;
  metrics?: DayMetricsResponse | null;
}

function normalizeDayDate(date: string): string {
  return date.includes('T') ? date.split('T')[0]! : date;
}

function parseHmToMinutes(hm: string): number | null {
  const match = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function durationMinutesBetweenWindows(start?: string, end?: string): number | undefined {
  const startHm = extractHmFromWindow(start);
  const endHm = extractHmFromWindow(end);
  if (!startHm || !endHm) return undefined;
  const startMinutes = parseHmToMinutes(startHm);
  const endMinutes = parseHmToMinutes(endHm);
  if (startMinutes == null || endMinutes == null) return undefined;
  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60;
  if (diff <= 0 || diff > 36 * 60) return undefined;
  return diff;
}

function resolveWorkbenchTimelineIcon(
  typeKey: ItineraryItemType,
  display: ReturnType<typeof getItineraryItemTypeDisplay>,
  highlight?: boolean,
): LucideIcon {
  if (typeKey === 'REST') return User;
  if (typeKey === 'TRANSIT') return Car;
  if (typeKey === 'ACTIVITY' && highlight) return ShoppingBag;
  return display.icon;
}

function buildWorkbenchTimelineSubtitle(input: {
  item: ItineraryItemDetail;
  typeKey: ItineraryItemType;
  display: ReturnType<typeof getItineraryItemTypeDisplay>;
  startTime?: string;
  endTime?: string;
  travelBits: string[];
  isLodging: boolean;
}): string {
  const { typeKey, display, startTime, endTime, travelBits, isLodging, item } = input;

  if (travelBits.length > 0) {
    return travelBits.join(' · ');
  }

  const stayMinutes = durationMinutesBetweenWindows(startTime, endTime);

  if (isLodging) {
    if (itemSpansOvernight(item)) {
      const duration =
        stayMinutes != null ? formatWorkbenchDurationMinutes(stayMinutes) : undefined;
      return duration ? `入住至次日退房 · ${duration}` : '入住至次日退房';
    }
    return stayMinutes != null
      ? `住宿 · ${formatWorkbenchDurationMinutes(stayMinutes)}`
      : '住宿';
  }

  const duration =
    stayMinutes != null ? formatWorkbenchDurationMinutes(stayMinutes) : undefined;

  if (typeKey === 'REST') {
    return duration ? `休息 · 拍照 · ${duration}` : '休息 · 拍照';
  }
  if (typeKey === 'ACTIVITY') {
    return duration ? `游览 · ${duration}` : '游览';
  }
  if (duration) {
    return `${display.shortLabel} · ${duration}`;
  }
  return display.shortLabel;
}

function resolveWorkbenchDayTimelineItems(
  dayIndex: number,
  trip: TripDetail | null,
  itineraryByDay: Map<string, ItineraryItemDetail[]>,
): ItineraryItemDetail[] {
  const day = trip?.TripDay?.[dayIndex];
  if (!day) return [];

  const norm = normalizeDayDate(day.date);
  const dayItems =
    itineraryByDay.get(day.date) ?? itineraryByDay.get(norm) ?? day.ItineraryItem ?? [];

  const nextDay = trip?.TripDay?.[dayIndex + 1];
  const nextNorm = nextDay ? normalizeDayDate(nextDay.date) : null;
  const nextItems = nextDay
    ? itineraryByDay.get(nextDay.date) ??
      itineraryByDay.get(nextNorm!) ??
      nextDay.ItineraryItem ??
      []
    : [];

  const bridgedOvernight = getOvernightItemsForPriorDayTimeline(nextItems, dayIndex + 1).filter(
    (item) => !dayItems.some((existing) => existing.id === item.id),
  );
  const baseItems = filterCheckoutDayTimelineItems(dayItems, dayIndex);
  const carRentalReturns =
    trip?.TripDay != null
      ? getCarRentalReturnItemsForDayTimeline(trip.TripDay, dayIndex, itineraryByDay)
      : [];

  return sortItineraryItemsForDisplay([
    ...baseItems,
    ...carRentalReturns,
    ...bridgedOvernight,
  ]);
}

function resolveWorkbenchTimelineEntryDetail(
  place: ItineraryItemDetail['Place'],
): WorkbenchTimelineEntryDetail | undefined {
  if (!place) return undefined;

  const metadata = place.metadata;
  const description = place.description?.trim() || undefined;
  const phone = metadata?.phone?.trim() || undefined;
  const website = metadata?.website?.trim() || undefined;
  const tags = metadata?.tags?.filter((tag) => typeof tag === 'string' && tag.trim()).slice(0, 5);

  if (!description && !phone && !website && (!tags || tags.length === 0)) {
    return undefined;
  }

  return {
    description,
    phone,
    website,
    tags,
  };
}

function buildTimelineEntries(
  items: ItineraryItemDetail[],
  travelInfo?: DayTravelInfoResponse | null,
  timezone?: string,
): WorkbenchTimelineEntry[] {
  const entries: WorkbenchTimelineEntry[] = [];

  for (const item of items) {
    const typeKey = isItineraryItemType(item.type) ? item.type : 'ACTIVITY';
    const display = getItineraryItemTypeDisplay(typeKey);
    const timeLabel = formatItineraryItemTimeRangeLabel(item, timezone);
    const splitMarker = parseItinerarySplitPlanNote(item.note);
    const noteBody = stripSplitPlanNoteLines(item.note);
    const placeName = resolveWorkbenchTimelineItemTitle(item);

    const segment = travelInfo?.segments?.find((s) => s.toItemId === item.id);
    const showTravelConnector = segment != null && travelSegmentHasData(segment);
    const travelBits: string[] = [];
    if (!showTravelConnector && segment?.distance) {
      travelBits.push(formatWorkbenchDistanceKm(segment.distance / 1000));
    }
    if (!showTravelConnector && segment?.duration) {
      travelBits.push(formatWorkbenchDurationMinutes(segment.duration));
    }

    const isLodging = isAccommodationItineraryItem(item);
    const typeBadge = isLodging
      ? { emoji: '🏨', label: '住宿' }
      : getItineraryItemTimelineTypeBadge(item);
    const place = item.Place;
    const imageUrl = collectPlaceImages({ place })[0]?.url;
    const address = place?.address?.trim() || undefined;
    const detail = resolveWorkbenchTimelineEntryDetail(place);

    const stayMinutes = durationMinutesBetweenWindows(item.startTime, item.endTime);
    const highlight =
      typeKey === 'REST' ||
      noteBody.includes('住宿') ||
      (typeKey === 'ACTIVITY' && stayMinutes != null && stayMinutes >= 90);

    const subtitle = buildWorkbenchTimelineSubtitle({
      item,
      typeKey,
      display,
      startTime: item.startTime,
      endTime: item.endTime,
      travelBits,
      isLodging,
    });

    const splitLabel = splitMarker ? formatItinerarySplitGroupLabel(splitMarker) : undefined;
    const showSplitLabel = shouldShowWorkbenchSplitGroupLabel(splitLabel);

    entries.push({
      id: item.id,
      timeLabel,
      title: placeName,
      subtitle,
      icon: resolveWorkbenchTimelineIcon(typeKey, display, highlight),
      highlight,
      splitGroupLabel: showSplitLabel ? splitLabel : undefined,
      splitPhaseLabel:
        showSplitLabel && splitMarker
          ? itinerarySplitPhaseLabel(splitMarker.phase) ?? undefined
          : undefined,
      typeLabel: typeBadge.label,
      typeEmoji: typeBadge.emoji,
      imageUrl,
      address,
      isLodging,
      detail,
      travelSegmentBefore: showTravelConnector ? segment : undefined,
    });
  }

  return entries;
}

function conflictsForDay(
  items: PlanningConflictItem[],
  dayNumber: number,
): PlanningConflictItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const days = item.affectedDays ?? item.issue?.affectedDays;
    const matchesDay = days?.length ? days.includes(dayNumber) : item.priority === 'must_handle';
    if (!matchesDay) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalizeConflictText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 规划冲突与 metrics 冲突描述相同时视为重复（保留先出现的条目） */
export function isDuplicateWorkbenchConflictLine(
  existing: WorkbenchConflictLine,
  candidate: WorkbenchConflictLine,
): boolean {
  const labelA = normalizeConflictText(existing.label);
  const labelB = normalizeConflictText(candidate.label);
  if (labelA !== labelB) return false;

  const detailA = normalizeConflictText(existing.detail ?? '');
  const detailB = normalizeConflictText(candidate.detail ?? '');
  if (!detailA || !detailB) return true;
  if (detailA === detailB) return true;
  return detailA.includes(detailB) || detailB.includes(detailA);
}

export function dedupeWorkbenchConflictLines(lines: WorkbenchConflictLine[]): WorkbenchConflictLine[] {
  const result: WorkbenchConflictLine[] = [];
  for (const line of lines) {
    if (result.some((existing) => isDuplicateWorkbenchConflictLine(existing, line))) continue;
    result.push(line);
  }
  return result;
}

function mapConflictLines(
  dayConflicts: PlanningConflictItem[],
  dayMetrics?: DayMetricsResponse | null,
): WorkbenchConflictLine[] {
  const lines: WorkbenchConflictLine[] = [];

  for (const c of dayConflicts.slice(0, 4)) {
    const title = c.title?.trim() || '行程冲突';
    const message = c.message?.trim();
    lines.push({
      id: c.id,
      icon: Car,
      label: title,
      detail: message && message !== title ? message : undefined,
      severity: c.priority === 'must_handle' ? 'hard' : 'soft',
    });
  }

  for (const mc of dayMetrics?.conflicts ?? []) {
    lines.push({
      id: `metric-${mc.type}-${mc.title}`,
      icon: Car,
      label: mc.title,
      detail: mc.description?.trim(),
      severity: mc.severity === 'HIGH' ? 'hard' : 'soft',
      delta: mc.severity === 'HIGH' ? '!' : undefined,
    });
  }

  return dedupeWorkbenchConflictLines(lines).slice(0, 5);
}

export type WorkbenchItineraryLoadingPhase =
  | 'idle'
  | 'loading_schedule'
  | 'loading_travel'
  | 'loading_metrics';

export const WORKBENCH_ITINERARY_LOADING_LABELS: Record<
  Exclude<WorkbenchItineraryLoadingPhase, 'idle'>,
  string
> = {
  loading_schedule: '正在加载当日行程…',
  loading_travel: '正在核对交通时间…',
  loading_metrics: '正在分析冲突与驾驶强度…',
};

export function resolveWorkbenchItineraryLoadingLabel(
  phase: WorkbenchItineraryLoadingPhase,
  conflictsLoading?: boolean,
): string {
  if (phase !== 'idle') {
    return WORKBENCH_ITINERARY_LOADING_LABELS[phase];
  }
  if (conflictsLoading) {
    return '正在同步规划冲突…';
  }
  return '正在加载…';
}

export function useWorkbenchItineraryData(
  tripId: string | null | undefined,
  trip: TripDetail | null,
  conflictItems: PlanningConflictItem[],
  refreshKey = 0,
  options?: { dailyDriveLimitMinutes?: number },
) {
  const dailyDriveLimitMinutes =
    options?.dailyDriveLimitMinutes ?? readDailyDriveLimitHours(trip) * 60;
  const [itineraryByDay, setItineraryByDay] = useState<Map<string, ItineraryItemDetail[]>>(new Map());
  const [travelInfoMap, setTravelInfoMap] = useState<Map<string, DayTravelInfoResponse>>(new Map());
  const [metricsByDay, setMetricsByDay] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<WorkbenchItineraryLoadingPhase>('idle');

  const reload = useCallback(async () => {
    if (!tripId || !trip?.TripDay?.length) return;
    setLoading(true);
    setLoadingPhase('loading_schedule');
    try {
      try {
        const timelineResult = await tripsApi.getScheduleTimeline(tripId, {
          include: 'items,metrics,travelInfo',
          travelInfoMode: 'cached',
        });
        if (timelineResult.status !== 'not_modified' && timelineResult.data) {
          setLoadingPhase('loading_metrics');
          const applied = applyScheduleTimelineToMaps(
            timelineResult.data,
            () => [],
            trip.TripDay,
          );
          setItineraryByDay(applied.itemsMap);
          setTravelInfoMap(applied.travelInfoMap);
          setMetricsByDay(applied.metricsMap);
          return;
        }
      } catch (timelineError) {
        if (!isScheduleTimelineUnavailable(timelineError)) {
          console.warn('[useWorkbenchItineraryData] schedule-timeline failed, falling back', timelineError);
        }
      }

      const itemsMap = new Map<string, ItineraryItemDetail[]>();
      const metricsMap = new Map<string, DayMetricsResponse>();

      setLoadingPhase('loading_schedule');
      const allItems = await itineraryItemsApi.getByTrip(tripId).catch(() => [] as ItineraryItemDetail[]);
      const itemsByDayId = new Map<string, ItineraryItemDetail[]>();
      for (const item of allItems) {
        const dayId = item.tripDayId ?? item.TripDay?.id;
        if (!dayId) continue;
        const bucket = itemsByDayId.get(dayId);
        if (bucket) bucket.push(item);
        else itemsByDayId.set(dayId, [item]);
      }

      for (const day of trip.TripDay) {
        const norm = normalizeDayDate(day.date);
        const items = itemsByDayId.get(day.id) ?? [];
        itemsMap.set(norm, items);
        itemsMap.set(day.date, items);
      }

      setLoadingPhase('loading_travel');
      const travelMap = await loadTripDayTravelInfoMapCached(tripId, trip);

      setItineraryByDay(itemsMap);
      setTravelInfoMap(travelMap);

      setLoadingPhase('loading_metrics');
      await Promise.all(
        trip.TripDay.map(async (day) => {
          const norm = normalizeDayDate(day.date);
          const metrics = await tripsApi.getDayMetrics(tripId, day.id).catch(() => null);
          if (metrics) {
            metricsMap.set(norm, metrics);
            metricsMap.set(day.date, metrics);
          }
        }),
      );

      setMetricsByDay(metricsMap);
    } finally {
      setLoading(false);
      setLoadingPhase('idle');
    }
  }, [tripId, trip]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const routeStats = useMemo((): WorkbenchRouteStats | null => {
    if (!trip?.TripDay?.length) return null;
    let totalDistanceKm = 0;
    let totalDriveMinutes = 0;
    let dayCount = 0;

    for (const day of trip.TripDay) {
      const norm = normalizeDayDate(day.date);
      const info = travelInfoMap.get(norm) ?? travelInfoMap.get(day.date);
      if (info?.summary) {
        totalDistanceKm += (info.summary.totalDistance ?? 0) / 1000;
        totalDriveMinutes += info.summary.totalDuration ?? 0;
        dayCount += 1;
      }
    }

    const avgDailyDriveMinutes = dayCount > 0 ? totalDriveMinutes / dayCount : 0;
    const overtimeMinutes = Math.max(0, avgDailyDriveMinutes - dailyDriveLimitMinutes);

    return {
      totalDistanceKm,
      totalDriveMinutes,
      avgDailyDriveMinutes,
      overtimeMinutes,
      dailyDriveLimitMinutes,
    };
  }, [trip, travelInfoMap, dailyDriveLimitMinutes]);

  const routeStops = useMemo(
    () => routeStopsFromTrip(trip, itineraryByDay),
    [trip, itineraryByDay],
  );

  const buildDaySnapshot = useCallback(
    (dayIndex: number): WorkbenchDaySnapshot | null => {
      const day = trip?.TripDay?.[dayIndex];
      if (!day) return null;

      const norm = normalizeDayDate(day.date);
      const scheduleTimezone = resolveDestinationTimezone(trip?.destination);
      const timelineItems = resolveWorkbenchDayTimelineItems(dayIndex, trip, itineraryByDay);
      const travelInfo = travelInfoMap.get(norm) ?? travelInfoMap.get(day.date);
      const metrics = metricsByDay.get(norm) ?? metricsByDay.get(day.date);
      const dayNumber = dayIndex + 1;

      let dateLabel = norm;
      let weekdayLabel = '';
      try {
        const d = new Date(day.date);
        dateLabel = format(d, 'M月d日', { locale: zhCN });
        weekdayLabel = format(d, '(EEE)', { locale: zhCN });
      } catch {
        /* keep fallback */
      }

      const dayConflicts = conflictsForDay(conflictItems, dayNumber);
      const dayDriveMinutes = travelInfo?.summary?.totalDuration ?? metrics?.metrics?.drive ?? 0;
      const hasBlocker =
        dayConflicts.some((c) => c.priority === 'must_handle') ||
        (metrics?.conflicts?.some((c) => c.severity === 'HIGH') ?? false);

      const conflictLines = mapConflictLines(dayConflicts, metrics);
      if (dayDriveMinutes > dailyDriveLimitMinutes) {
        const over = dayDriveMinutes - dailyDriveLimitMinutes;
        conflictLines.unshift({
          id: 'drive-over-limit',
          icon: Car,
          label: `预计驾驶 ${formatWorkbenchDurationMinutes(dayDriveMinutes)}，超过上限 ${formatWorkbenchDurationMinutes(dailyDriveLimitMinutes)}`,
          delta: `+${formatWorkbenchDurationMinutes(over)}`,
        });
      }

      return {
        dayIndex,
        dayNumber,
        dateLabel,
        weekdayLabel,
        executable: !hasBlocker,
        timeline: buildTimelineEntries(timelineItems, travelInfo, scheduleTimezone),
        conflictLines,
        dayDriveMinutes,
        metrics,
      };
    },
    [
      trip,
      itineraryByDay,
      travelInfoMap,
      metricsByDay,
      conflictItems,
      dailyDriveLimitMinutes,
    ],
  );

  return {
    loading,
    loadingPhase,
    itineraryByDay,
    routeStops,
    routeStats,
    buildDaySnapshot,
    reload,
  };
}
