import { DateTime } from 'luxon';
import type { ItineraryItemDetail, TravelSegment } from '@/types/trip';
import { travelSegmentHasData } from '@/lib/itinerary-travel-info';

export interface InterDayTravelTiming {
  segment: TravelSegment;
  fromDayNumber: number;
  travelMinutes: number;
  suggestedDepartLabel: string;
  earliestArrivalLabel: string;
  firstActivityStartLabel: string | null;
  isStartTooEarly: boolean;
  gapMinutes: number;
  message: string;
}

function formatHm(dt: DateTime): string {
  if (!dt.isValid) return '--:--';
  return dt.toFormat('HH:mm');
}

function formatTravelMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

/** 根据昨日末项结束时间 + 跨天路程，判断今日首项开始是否可行 */
export function analyzeInterDayTravelTiming(
  segment: TravelSegment,
  fromDayNumber: number,
  prevLastItem: ItineraryItemDetail | null | undefined,
  firstNextItem: ItineraryItemDetail | null | undefined,
  timezone = 'UTC',
): InterDayTravelTiming | null {
  if (!travelSegmentHasData(segment)) return null;

  const travelMinutes = Number(segment.duration ?? 0);
  const fromPlace = segment.fromPlace || prevLastItem?.Place?.nameCN || prevLastItem?.Place?.nameEN || '昨日终点';
  const toPlace =
    segment.toPlace || firstNextItem?.Place?.nameCN || firstNextItem?.Place?.nameEN || '今日首项';

  if (!prevLastItem?.endTime || !firstNextItem?.startTime) {
    return {
      segment,
      fromDayNumber,
      travelMinutes,
      suggestedDepartLabel:
        travelMinutes > 0
          ? `自第 ${fromDayNumber} 天约需 ${formatTravelMinutes(travelMinutes)}`
          : `自第 ${fromDayNumber} 天衔接`,
      earliestArrivalLabel: '',
      firstActivityStartLabel: firstNextItem?.startTime
        ? formatHm(DateTime.fromISO(firstNextItem.startTime, { zone: 'utc' }).setZone(timezone))
        : null,
      isStartTooEarly: false,
      gapMinutes: 0,
      message:
        travelMinutes > 0
          ? `今日行程请预留约 ${formatTravelMinutes(travelMinutes)} 的跨天交通（${fromPlace} → ${toPlace}）。`
          : '请确认跨天交通时间是否已写入今日首项。',
    };
  }

  const departAt = DateTime.fromISO(prevLastItem.endTime, { zone: 'utc' }).setZone(timezone);
  const arriveAt = departAt.plus({ minutes: travelMinutes });
  const activityStart = DateTime.fromISO(firstNextItem.startTime, { zone: 'utc' }).setZone(timezone);
  const gapMinutes = activityStart.diff(arriveAt, 'minutes').minutes;
  const isStartTooEarly = gapMinutes < -5;

  const suggestedDepartLabel = `${formatHm(departAt)} 自「${fromPlace}」出发`;
  const earliestArrivalLabel = `约 ${formatHm(arriveAt)} 抵达「${toPlace}」`;
  const firstActivityStartLabel = formatHm(activityStart);

  let message: string;
  if (isStartTooEarly) {
    const shortfall = Math.abs(Math.round(gapMinutes));
    message = `首项 ${firstActivityStartLabel} 开始，路上约需 ${formatTravelMinutes(travelMinutes)}，时间不够（差约 ${shortfall} 分钟）。建议 ${formatHm(departAt)} 前出发，或将首项推迟到 ${formatHm(arriveAt)} 之后。`;
  } else if (gapMinutes <= 30) {
    message = `路上约 ${formatTravelMinutes(travelMinutes)}，抵达后缓冲较短，建议按 ${formatHm(departAt)} 出发。`;
  } else {
    message = `路上约 ${formatTravelMinutes(travelMinutes)}；若 ${formatHm(departAt)} 出发，约 ${formatHm(arriveAt)} 抵达，距首项开始还有约 ${Math.round(gapMinutes)} 分钟。`;
  }

  return {
    segment,
    fromDayNumber,
    travelMinutes,
    suggestedDepartLabel,
    earliestArrivalLabel,
    firstActivityStartLabel,
    isStartTooEarly,
    gapMinutes,
    message,
  };
}

export function mergeCrossDayIntoDaySummary(
  summary: { totalDuration: number; totalDistance: number; segmentCount: number } | undefined,
  crossDaySegment: TravelSegment | null,
): { totalDuration: number; totalDistance: number; segmentCount: number } | null {
  const crossDuration = crossDaySegment?.duration ?? 0;
  const crossDistance = crossDaySegment?.distance ?? 0;
  if (!summary && crossDuration <= 0 && crossDistance <= 0) return null;
  if (!summary) {
    return {
      totalDuration: crossDuration,
      totalDistance: crossDistance,
      segmentCount: crossDuration > 0 || crossDistance > 0 ? 1 : 0,
    };
  }
  return {
    totalDuration: summary.totalDuration + crossDuration,
    totalDistance: summary.totalDistance + crossDistance,
    segmentCount: summary.segmentCount + (crossDuration > 0 || crossDistance > 0 ? 1 : 0),
  };
}
