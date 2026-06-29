import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import { readinessApi, type CoverageMapResponse } from '@/api/readiness';
import { loadTripDayTravelInfoMapCached } from '@/lib/itinerary-travel-info';
import {
  applyScheduleTimelineToMaps,
  isScheduleTimelineUnavailable,
} from '@/lib/schedule-timeline-apply';
import { sortItineraryItemsForDisplay } from '@/lib/itinerary-item-sort';
import { extractHmFromWindow, formatDurationBetweenWindows } from '@/lib/itinerary-item-card-format';
import { getItineraryItemTypeDisplay, isItineraryItemType } from '@/lib/itinerary-item-type-display';
import type {
  DayMetricsResponse,
  DayTravelInfoResponse,
  ItineraryItemDetail,
  TripDetail,
} from '@/types/trip';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { LucideIcon } from 'lucide-react';
import { Car } from 'lucide-react';
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
} from './workbench-format.util';

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
}

export interface WorkbenchConflictLine {
  id: string;
  icon: LucideIcon;
  label: string;
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

function buildTimelineEntries(
  items: ItineraryItemDetail[],
  travelInfo?: DayTravelInfoResponse | null,
): WorkbenchTimelineEntry[] {
  const sorted = sortItineraryItemsForDisplay(items);
  const entries: WorkbenchTimelineEntry[] = [];

  for (const item of sorted) {
    const typeKey = isItineraryItemType(item.type) ? item.type : 'ACTIVITY';
    const display = getItineraryItemTypeDisplay(typeKey);
    const timeLabel =
      extractHmFromWindow(item.startTime) ??
      extractHmFromWindow(item.endTime) ??
      '—';
    const splitMarker = parseItinerarySplitPlanNote(item.note);
    const noteBody = stripSplitPlanNoteLines(item.note);
    const placeName = resolveWorkbenchTimelineItemTitle(item);

    const durationLabel = formatDurationBetweenWindows(item.startTime, item.endTime);
    const segment = travelInfo?.segments?.find(
      (s) => s.toItemId === item.id || s.fromItemId === item.id,
    );
    const travelBits: string[] = [];
    if (segment?.distance) travelBits.push(formatWorkbenchDistanceKm(segment.distance / 1000));
    if (segment?.duration) {
      travelBits.push(formatWorkbenchDurationMinutes(segment.duration));
    } else if (durationLabel) {
      travelBits.push(durationLabel.replace(/小时/g, 'h ').replace(/分钟/g, 'm'));
    }

    const subtitle =
      travelBits.length > 0
        ? travelBits.join(' · ')
        : durationLabel
          ? `${display.shortLabel} · ${durationLabel}`
          : display.shortLabel;

    entries.push({
      id: item.id,
      timeLabel,
      title: placeName,
      subtitle,
      icon: display.icon,
      highlight: typeKey === 'REST' || noteBody.includes('住宿'),
      splitGroupLabel: splitMarker ? formatItinerarySplitGroupLabel(splitMarker) : undefined,
      splitPhaseLabel: splitMarker ? itinerarySplitPhaseLabel(splitMarker.phase) ?? undefined : undefined,
    });
  }

  return entries;
}

function conflictsForDay(
  items: PlanningConflictItem[],
  dayNumber: number,
): PlanningConflictItem[] {
  return items.filter((item) => {
    const days = item.affectedDays ?? item.issue?.affectedDays;
    if (!days?.length) return item.priority === 'must_handle';
    return days.includes(dayNumber);
  });
}

function mapConflictLines(
  dayConflicts: PlanningConflictItem[],
  dayMetrics?: DayMetricsResponse | null,
): WorkbenchConflictLine[] {
  const lines: WorkbenchConflictLine[] = [];

  for (const c of dayConflicts.slice(0, 4)) {
    lines.push({
      id: c.id,
      icon: Car,
      label: c.message?.trim() || c.title,
      delta: c.priority === 'must_handle' ? undefined : undefined,
    });
  }

  for (const mc of dayMetrics?.conflicts ?? []) {
    lines.push({
      id: `metric-${mc.type}-${mc.title}`,
      icon: Car,
      label: mc.title,
      delta: mc.severity === 'HIGH' ? '!' : undefined,
    });
  }

  return lines.slice(0, 5);
}

export function useWorkbenchItineraryData(
  tripId: string | null | undefined,
  trip: TripDetail | null,
  conflictItems: PlanningConflictItem[],
  refreshKey = 0,
  options?: { dailyDriveLimitMinutes?: number; showRouteMap?: boolean },
) {
  const dailyDriveLimitMinutes =
    options?.dailyDriveLimitMinutes ?? readDailyDriveLimitHours(trip) * 60;
  const [itineraryByDay, setItineraryByDay] = useState<Map<string, ItineraryItemDetail[]>>(new Map());
  const [travelInfoMap, setTravelInfoMap] = useState<Map<string, DayTravelInfoResponse>>(new Map());
  const [metricsByDay, setMetricsByDay] = useState<Map<string, DayMetricsResponse>>(new Map());
  const [coverageMap, setCoverageMap] = useState<CoverageMapResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId || !trip?.TripDay?.length) return;
    setLoading(true);
    try {
      try {
        const timelineResult = await tripsApi.getScheduleTimeline(tripId, {
          include: 'items,metrics,travelInfo',
          travelInfoMode: 'cached',
        });
        if (timelineResult.status !== 'not_modified' && timelineResult.data) {
          const applied = applyScheduleTimelineToMaps(
            timelineResult.data,
            () => [],
            trip.TripDay,
          );
          setItineraryByDay(applied.itemsMap);
          setTravelInfoMap(applied.travelInfoMap);
          setMetricsByDay(applied.metricsMap);

          if (options?.showRouteMap) {
            const mapData = await readinessApi.getCoverageMapData(tripId).catch(() => null);
            setCoverageMap(mapData);
          }
          return;
        }
      } catch (timelineError) {
        if (!isScheduleTimelineUnavailable(timelineError)) {
          console.warn('[useWorkbenchItineraryData] schedule-timeline failed, falling back', timelineError);
        }
      }

      const itemsMap = new Map<string, ItineraryItemDetail[]>();
      const metricsMap = new Map<string, DayMetricsResponse>();

      const allItems = await itineraryItemsApi.getByTrip(tripId).catch(() => [] as ItineraryItemDetail[]);
      const itemsByDayId = new Map<string, ItineraryItemDetail[]>();
      for (const item of allItems) {
        const dayId = item.tripDayId ?? item.TripDay?.id;
        if (!dayId) continue;
        const bucket = itemsByDayId.get(dayId);
        if (bucket) bucket.push(item);
        else itemsByDayId.set(dayId, [item]);
      }

      await Promise.all(
        trip.TripDay.map(async (day) => {
          const norm = normalizeDayDate(day.date);
          const items = itemsByDayId.get(day.id) ?? [];
          const metrics = await tripsApi.getDayMetrics(tripId, day.id).catch(() => null);
          itemsMap.set(norm, items);
          itemsMap.set(day.date, items);
          if (metrics) {
            metricsMap.set(norm, metrics);
            metricsMap.set(day.date, metrics);
          }
        }),
      );

      const travelMap = await loadTripDayTravelInfoMapCached(tripId, trip);

      setItineraryByDay(itemsMap);
      setTravelInfoMap(travelMap);
      setMetricsByDay(metricsMap);

      if (options?.showRouteMap) {
        const mapData = await readinessApi.getCoverageMapData(tripId).catch(() => null);
        setCoverageMap(mapData);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, trip, options?.showRouteMap]);

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

  const buildDaySnapshot = useCallback(
    (dayIndex: number): WorkbenchDaySnapshot | null => {
      const day = trip?.TripDay?.[dayIndex];
      if (!day) return null;

      const norm = normalizeDayDate(day.date);
      const items =
        itineraryByDay.get(norm) ??
        itineraryByDay.get(day.date) ??
        day.ItineraryItem ??
        [];
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
        timeline: buildTimelineEntries(items as ItineraryItemDetail[], travelInfo),
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
    coverageMap,
    routeStats,
    buildDaySnapshot,
    reload,
  };
}
