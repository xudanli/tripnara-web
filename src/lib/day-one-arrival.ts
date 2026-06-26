import { DateTime } from 'luxon';
import type { ItineraryItemDetail, TravelSegment } from '@/types/trip';
import { travelSegmentHasData } from '@/lib/itinerary-travel-info';
import { isOvernightStayDisplayItem } from '@/lib/itinerary-item-sort';
import { isCarRentalItineraryItem } from '@/lib/trip-car-rental-status';
import { isTransitLikeItemType } from '@/lib/itinerary-item-card-format';
import { getExplicitItinerarySpecialDisplayRole } from '@/lib/itinerary-special-display';

export interface DayOneArrivalStatus {
  isArrivalHub: boolean;
  hubLabel: string | null;
  kind: 'hub_place' | 'flight_transit' | 'rail_transit' | 'other_transit' | 'not_arrival';
  message: string;
}

export interface DayOneDepartureTiming {
  segment: TravelSegment;
  travelMinutes: number;
  suggestedDepartLabel: string;
  earliestArrivalLabel: string;
  firstActivityStartLabel: string | null;
  isStartTooEarly: boolean;
  gapMinutes: number;
  message: string;
}

const ARRIVAL_NAME_RE =
  /机场|国际机场|航站|Airport|Terminal|火车站|高铁站|动车站|车站|枢纽|站$|Railway|Station/i;

function itemDisplayName(item: ItineraryItemDetail): string {
  return item.Place?.nameCN || item.Place?.nameEN || item.note?.split('\n')[0] || '行程项';
}

function itemMetadata(item: ItineraryItemDetail): Record<string, unknown> {
  const raw = (item as { metadata?: unknown }).metadata;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/** 第一天首项是否为落地机场 / 火车站（或等价的航班/铁路到达段） */
export function isArrivalHubItem(item: ItineraryItemDetail | null | undefined): boolean {
  if (!item) return false;

  const explicit = getExplicitItinerarySpecialDisplayRole(item);
  if (explicit === 'landing_point') return true;
  if (explicit === 'departure_point') return false;
  if (explicit && explicit !== 'landing_point') return false;

  const category = item.Place?.category;
  if (category === 'TRANSIT_HUB') return true;

  const meta = itemMetadata(item);
  const source = typeof meta.source === 'string' ? meta.source.toLowerCase() : '';
  if (source === 'flight' || source === 'rail') return true;

  const name = itemDisplayName(item);
  if (ARRIVAL_NAME_RE.test(name)) return true;

  if (item.type === 'TRANSIT' && isTransitLikeItemType(item.type)) {
    return ARRIVAL_NAME_RE.test(name) || source === 'flight' || source === 'rail';
  }

  return false;
}

export function analyzeDayOneArrival(
  firstItem: ItineraryItemDetail | null | undefined,
): DayOneArrivalStatus {
  if (!firstItem) {
    return {
      isArrivalHub: false,
      hubLabel: null,
      kind: 'not_arrival',
      message: '第一天建议从落地机场或火车站开始，请先添加到达站点或航班/车次。',
    };
  }

  const label = itemDisplayName(firstItem);
  const meta = itemMetadata(firstItem);
  const source = typeof meta.source === 'string' ? meta.source.toLowerCase() : '';

  if (firstItem.Place?.category === 'TRANSIT_HUB' || ARRIVAL_NAME_RE.test(label)) {
    return {
      isArrivalHub: true,
      hubLabel: label,
      kind: 'hub_place',
      message: `今日从「${label}」落地开始，后续活动请在此基础上安排交通与缓冲。`,
    };
  }

  if (source === 'flight') {
    return {
      isArrivalHub: true,
      hubLabel: label,
      kind: 'flight_transit',
      message: `已记录航班「${label}」。若尚未添加落地机场 POI，建议在其后补充机场站点或按抵达时间衔接首个活动。`,
    };
  }

  if (source === 'rail') {
    return {
      isArrivalHub: true,
      hubLabel: label,
      kind: 'rail_transit',
      message: `已记录车次「${label}」。若尚未添加火车站 POI，建议在其后补充车站站点或按抵达时间衔接首个活动。`,
    };
  }

  if (firstItem.type === 'TRANSIT') {
    return {
      isArrivalHub: false,
      hubLabel: label,
      kind: 'other_transit',
      message: `首项为交通段「${label}」，第一天通常应以落地机场或火车站作为起点。`,
    };
  }

  return {
    isArrivalHub: false,
    hubLabel: label,
    kind: 'not_arrival',
    message: `首项「${label}」不是机场/车站。第一天建议把落地机场或火车站（或航班/车次抵达段）放在第一位。`,
  };
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

/** 落地站点 → 首个游玩/用餐项：何时出发、是否来得及 */
export function analyzeDayOneDepartureTiming(
  segment: TravelSegment,
  arrivalItem: ItineraryItemDetail,
  firstActivityItem: ItineraryItemDetail,
  timezone = 'UTC',
): DayOneDepartureTiming | null {
  if (!travelSegmentHasData(segment)) return null;

  const travelMinutes = Number(segment.duration ?? 0);
  const fromPlace = segment.fromPlace || itemDisplayName(arrivalItem);
  const toPlace = segment.toPlace || itemDisplayName(firstActivityItem);

  const hubDepartIso = arrivalItem.endTime ?? arrivalItem.startTime;

  if (!hubDepartIso || !firstActivityItem.startTime) {
    return {
      segment,
      travelMinutes,
      suggestedDepartLabel:
        travelMinutes > 0
          ? `自落地点约需 ${formatTravelMinutes(travelMinutes)}`
          : '自落地点出发',
      earliestArrivalLabel: '',
      firstActivityStartLabel: firstActivityItem.startTime
        ? formatHm(DateTime.fromISO(firstActivityItem.startTime, { zone: 'utc' }).setZone(timezone))
        : null,
      isStartTooEarly: false,
      gapMinutes: 0,
      message:
        travelMinutes > 0
          ? `前往「${toPlace}」约需 ${formatTravelMinutes(travelMinutes)}，请结合抵达时间预留缓冲。`
          : '请确认落地点至首个活动之间的交通时间。',
    };
  }

  const departAt = DateTime.fromISO(hubDepartIso, { zone: 'utc' }).setZone(timezone);
  const arriveAt = departAt.plus({ minutes: travelMinutes });
  const activityStart = DateTime.fromISO(firstActivityItem.startTime, { zone: 'utc' }).setZone(timezone);
  const gapMinutes = activityStart.diff(arriveAt, 'minutes').minutes;
  const isStartTooEarly = gapMinutes < -5;

  const isCheckout = isOvernightStayDisplayItem(arrivalItem);
  const isRentalPickup = isCarRentalItineraryItem(arrivalItem);
  const suggestedDepartLabel = isCheckout
    ? `${formatHm(departAt)} 退房后自「${fromPlace}」出发`
    : isRentalPickup
      ? `${formatHm(departAt)} 取车后自「${fromPlace}」出发`
      : `${formatHm(departAt)} 自「${fromPlace}」出发`;
  const earliestArrivalLabel = `约 ${formatHm(arriveAt)} 抵达「${toPlace}」`;
  const firstActivityStartLabel = formatHm(activityStart);

  let message: string;
  if (isStartTooEarly) {
    const shortfall = Math.abs(Math.round(gapMinutes));
    message = `首项活动 ${firstActivityStartLabel} 开始，路上约需 ${formatTravelMinutes(travelMinutes)}，时间不够（差约 ${shortfall} 分钟）。建议 ${formatHm(departAt)} 前出发，或将活动推迟到 ${formatHm(arriveAt)} 之后。`;
  } else if (gapMinutes <= 30) {
    message = `路上约 ${formatTravelMinutes(travelMinutes)}，抵达后缓冲较短，建议按 ${formatHm(departAt)} 从落地点出发。`;
  } else {
    message = `路上约 ${formatTravelMinutes(travelMinutes)}；若 ${formatHm(departAt)} 出发，约 ${formatHm(arriveAt)} 抵达，距活动开始还有约 ${Math.round(gapMinutes)} 分钟。`;
  }

  return {
    segment,
    travelMinutes,
    suggestedDepartLabel,
    earliestArrivalLabel,
    firstActivityStartLabel,
    isStartTooEarly,
    gapMinutes,
    message,
  };
}
