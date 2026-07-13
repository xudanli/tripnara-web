import type { TripDetail, TripState } from '@/types/trip';
import type { ScheduleResponse } from '@/types/trip';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';
import type { TeamThermometerData } from '@/types/in-trip-pulse';
import type { ThermometerLevel } from '@/types/in-trip-execution';

export type ExecuteStatusTone = 'success' | 'warning' | 'neutral';

export interface ExecuteMemberStatusItem {
  userId: string;
  displayName: string;
  conditionLabel: string;
  activityLabel: string;
  level: ThermometerLevel;
}

export interface ExecuteTransportStatusSnapshot {
  vehicleLabel: string;
  vehicleStatus: string;
  vehicleStatusTone: ExecuteStatusTone;
  arrivalPlaceLabel?: string;
  arrivalTime?: string;
  arrivalDelayMinutes?: number;
  roadConditionLabel?: string;
  roadConditionBadge?: string;
  roadConditionTone?: ExecuteStatusTone;
}

export type ExecuteResourceCategory = 'activity' | 'hot_spring' | 'hotel' | 'other';

export interface ExecuteResourceItem {
  id: string;
  title: string;
  statusLabel: string;
  statusTone: ExecuteStatusTone;
  category: ExecuteResourceCategory;
}

function conditionLabelFromLevel(level: ThermometerLevel): string {
  if (level === 'red' || level === 'orange') return '轻微疲劳';
  if (level === 'yellow') return '略疲劳';
  return '状态良好';
}

function activityLabelFromIndex(index: number, level: ThermometerLevel): string {
  if (level === 'red' || level === 'orange') return '休息中';
  if (index === 0) return '当前活动';
  return '同行中';
}

export function buildExecuteMemberStatusItems(input: {
  thermometer?: TeamThermometerData | null;
  fallbackMembers?: Array<{ userId: string; displayName: string }>;
}): ExecuteMemberStatusItem[] {
  if (input.thermometer?.memberCards?.length) {
    return input.thermometer.memberCards.map((member, index) => ({
      userId: member.userId,
      displayName: member.displayName,
      conditionLabel: conditionLabelFromLevel(member.level),
      activityLabel: activityLabelFromIndex(index, member.level),
      level: member.level,
    }));
  }

  return (input.fallbackMembers ?? []).slice(0, 6).map((member, index) => ({
    userId: member.userId,
    displayName: member.displayName,
    conditionLabel: '状态良好',
    activityLabel: activityLabelFromIndex(index, 'green'),
    level: 'green' as const,
  }));
}

export function buildExecuteTransportSnapshot(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  executionAdvisory?: TripExecutionAdvisoryDto | null;
  nextStopPlaceName?: string;
  arrivalTimeLabel?: string;
}): ExecuteTransportStatusSnapshot {
  const metadata = input.trip?.metadata ?? {};
  const vehicleLabel =
    (typeof metadata.vehicleName === 'string' && metadata.vehicleName) ||
    (typeof metadata.vehicleType === 'string' && metadata.vehicleType) ||
    (input.trip?.travelers?.length && input.trip.travelers.length > 1
      ? '团队用车'
      : '当前车辆');

  const delayMinutes = input.executionAdvisory?.currentState.delayMinutes ?? 0;
  const roadText = input.executionAdvisory?.realtimeRisks.road;
  const hasRoadRisk = Boolean(roadText && /风|险|封闭|谨慎|滑/i.test(roadText));

  return {
    vehicleLabel,
    vehicleStatus: input.tripState?.nextStop ? '行驶中' : '待出发',
    vehicleStatusTone: input.tripState?.nextStop ? 'success' : 'neutral',
    arrivalPlaceLabel: input.nextStopPlaceName,
    arrivalTime: input.arrivalTimeLabel,
    arrivalDelayMinutes: delayMinutes > 0 ? delayMinutes : undefined,
    roadConditionLabel: roadText,
    roadConditionBadge: hasRoadRisk ? '谨慎驾驶' : undefined,
    roadConditionTone: hasRoadRisk ? 'warning' : 'neutral',
  };
}

function inferResourceCategory(title: string, itemType?: string | null): ExecuteResourceCategory {
  const text = `${title} ${itemType ?? ''}`.toLowerCase();
  if (/温泉|hot.?spring|spa|bath/i.test(text)) return 'hot_spring';
  if (/hotel|酒店|inn|lodging|住宿|camp|营地/i.test(text)) return 'hotel';
  if (/徒步|hike|trek|glacier|冰川|trail|walk/i.test(text)) return 'activity';
  return 'other';
}

function mapBookingStatus(
  bookingStatus: string | null | undefined,
  category: ExecuteResourceCategory,
  isActive: boolean,
): { label: string; tone: ExecuteStatusTone } {
  if (isActive) {
    return { label: '进行中', tone: 'success' };
  }
  if (bookingStatus === 'BOOKED') {
    return category === 'hotel'
      ? { label: '今晚入住', tone: 'success' }
      : { label: '已预订', tone: 'success' };
  }
  if (bookingStatus === 'NEED_BOOKING') {
    return { label: '待确认', tone: 'warning' };
  }
  return { label: '已计划', tone: 'neutral' };
}

export function buildExecuteResourceItems(input: {
  todaySchedule?: ScheduleResponse | null;
  trip?: TripDetail | null;
  nextStopPlaceId?: number;
  limit?: number;
}): ExecuteResourceItem[] {
  const scheduleItems = input.todaySchedule?.schedule?.items ?? [];
  const limit = input.limit ?? 5;

  if (scheduleItems.length > 0) {
    return scheduleItems.slice(0, limit).map((item, idx) => {
      const category = inferResourceCategory(item.placeName, item.type);
      const isActive = item.placeId != null && item.placeId === input.nextStopPlaceId;
      const bookingStatus =
        typeof item.metadata?.bookingStatus === 'string'
          ? item.metadata.bookingStatus
          : undefined;
      const booking = mapBookingStatus(bookingStatus, category, isActive);
      return {
        id: String(item.placeId ?? idx),
        title: item.placeName,
        statusLabel: booking.label,
        statusTone: booking.tone,
        category,
      };
    });
  }

  const dayItems =
    input.trip?.TripDay?.flatMap((day) => day.ItineraryItem ?? []) ?? [];
  return dayItems.slice(0, limit).map((item, idx) => {
    const placeName = item.Place?.nameCN ?? item.Place?.nameEN ?? item.placeName ?? '行程点';
    const category = inferResourceCategory(placeName, item.type);
    const isActive = item.placeId != null && item.placeId === input.nextStopPlaceId;
    const booking = mapBookingStatus(item.bookingStatus ?? null, category, isActive);
    return {
      id: item.id ?? String(idx),
      title: placeName,
      statusLabel: booking.label,
      statusTone: booking.tone,
      category,
    };
  });
}
