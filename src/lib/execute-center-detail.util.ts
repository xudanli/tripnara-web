import { format, isValid } from 'date-fns';
import { formatScheduleTime, formatScheduleTimeRange } from '@/lib/itinerary-item-card-format';
import type { SplitGroupInfo } from '@/components/execute/live/ExecuteCenterPanels';
import type { ExecuteResourceItem } from '@/lib/execute-status-sidebar.util';
import type { ExecuteTimelineRailSnapshot } from '@/lib/execute-center.util';
import type { SplitPartySessionDetail, SplitPartySessionSummary } from '@/types/in-trip-split';
import type { ScheduleItem, TripDetail, TripState } from '@/types/trip';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';

export type ExecuteTimelineEntryStatus = 'done' | 'current' | 'upcoming';

export interface ExecuteDayTimelineEntry {
  id: string;
  timeLabel: string;
  title: string;
  detail?: string;
  status: ExecuteTimelineEntryStatus;
}

export interface ExecuteSplitGroupDetail extends SplitGroupInfo {
  transportNote?: string;
}

export interface ExecuteCenterRealtimeAlert {
  description: string;
  suggestedActions: string[];
}

export interface ExecuteCenterDetailModel {
  timeline: ExecuteDayTimelineEntry[];
  splitGroups: ExecuteSplitGroupDetail[];
  reunionSummary?: string;
  realtimeAlert?: ExecuteCenterRealtimeAlert;
}

function formatClock(value?: string): string {
  if (!value) return '--:--';
  return formatScheduleTime(value) || '--:--';
}

function resolveTimelineStatus(
  idx: number,
  currentIdx: number,
): ExecuteTimelineEntryStatus {
  if (currentIdx < 0) return 'upcoming';
  if (idx < currentIdx) return 'done';
  if (idx === currentIdx) return 'current';
  return 'upcoming';
}

function scheduleItemDetail(item: ScheduleItem): string | undefined {
  const meta = item.metadata as Record<string, unknown> | undefined;
  if (meta?.distanceKm && meta?.durationMinutes) {
    return `${meta.distanceKm} km · ${Math.round(Number(meta.durationMinutes) / 60)}h ${Number(meta.durationMinutes) % 60}m`;
  }
  if (item.endTime && item.startTime) {
    const range = formatScheduleTimeRange(item.startTime, item.endTime);
    if (/驾驶|交通|transfer|drive|transit/i.test(`${item.placeName} ${item.type}`)) {
      return range;
    }
    return `预计 ${range}`;
  }
  if (meta?.note && typeof meta.note === 'string') return meta.note;
  return undefined;
}

function collectScheduleItems(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: { schedule?: { items?: ScheduleItem[] } | null; date?: string } | null;
}): ScheduleItem[] {
  const fromSchedule = input.todaySchedule?.schedule?.items ?? [];
  if (fromSchedule.length > 0) return fromSchedule;

  const currentDay = input.trip?.TripDay?.find((day) => day.id === input.tripState?.currentDayId);
  const dayItems = currentDay?.ItineraryItem ?? [];
  return dayItems.map((item) => ({
    placeId: item.placeId ?? 0,
    placeName: item.Place?.nameCN ?? item.Place?.nameEN ?? item.placeName ?? '行程点',
    startTime: item.startTime ?? '',
    endTime: item.endTime ?? '',
    type: item.type,
    metadata: item.metadata as Record<string, unknown> | undefined,
  }));
}

export function resolveExecuteDayTimeline(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: { schedule?: { items?: ScheduleItem[] } | null; date?: string } | null;
  formatPlaceName?: (name: string, placeId?: number) => string;
}): ExecuteDayTimelineEntry[] {
  const items = collectScheduleItems(input);
  if (items.length === 0) return [];

  const currentPlaceId = (() => {
    const currentItemId = input.tripState?.currentItemId;
    if (!currentItemId || !input.trip?.TripDay) return undefined;
    const all = input.trip.TripDay.flatMap((day) => day.ItineraryItem ?? []);
    return all.find((item) => item.id === currentItemId)?.placeId ?? undefined;
  })();

  const nextPlaceId = input.tripState?.nextStop?.placeId ?? undefined;
  let currentIdx = currentPlaceId != null
    ? items.findIndex((item) => item.placeId === currentPlaceId)
    : -1;
  if (currentIdx < 0 && nextPlaceId != null) {
    currentIdx = items.findIndex((item) => item.placeId === nextPlaceId);
  }

  return items.map((item, idx) => {
    const title = input.formatPlaceName
      ? input.formatPlaceName(item.placeName, item.placeId)
      : item.placeName;
    return {
      id: `${item.placeId}-${idx}`,
      timeLabel: formatClock(item.startTime),
      title,
      detail: scheduleItemDetail(item),
      status: resolveTimelineStatus(idx, currentIdx),
    };
  });
}

function intensityFromLabel(label?: string): SplitGroupInfo['intensity'] {
  if (!label) return 'medium';
  if (/低|low|轻松|休息/i.test(label)) return 'low';
  if (/高|high|强/i.test(label)) return 'high';
  return 'medium';
}

function resolveReunionSummary(input: {
  timelineRail?: ExecuteTimelineRailSnapshot;
  splitSessionDetail?: SplitPartySessionDetail | null;
}): string | undefined {
  const reunion = input.splitSessionDetail?.reunion;
  if (reunion?.meetingPoint || reunion?.plannedTime) {
    const parts = [reunion.plannedTime, reunion.meetingPoint].filter(Boolean);
    if (parts.length > 0) return `统一汇合：${parts.join(' · ')}`;
  }

  const meetingNode = input.splitSessionDetail?.sharedNodes.find(
    (node) => node.type === 'meeting_point',
  );
  if (meetingNode) {
    const parts = [meetingNode.time, meetingNode.location ?? meetingNode.title].filter(Boolean);
    if (parts.length > 0) return `统一汇合：${parts.join(' · ')}`;
  }

  const { gathering } = input.timelineRail ?? { gathering: {} };
  const reunionParts: string[] = [];
  if (gathering.time || gathering.place) {
    reunionParts.push(
      [gathering.time, gathering.place ? `${gathering.place}停车场` : null].filter(Boolean).join(' '),
    );
  }
  if (gathering.destination) {
    reunionParts.push(gathering.destination.replace(/^统一前往/, '前往'));
  }
  if (reunionParts.length >= 2) return `统一汇合：${reunionParts.join(' → ')}`;
  if (reunionParts.length === 1) return `统一汇合：${reunionParts[0]}`;
  return undefined;
}

function mapSplitSessionGroups(
  detail: SplitPartySessionDetail,
  memberNameById?: Record<string, string>,
): ExecuteSplitGroupDetail[] {
  const meetingNode = detail.sharedNodes.find((node) => node.type === 'meeting_point');

  return detail.groups.map((group, index) => {
    const primaryRoute = group.route[0];
    const leaderId = group.memberIds[0];
    return {
      id: group.groupId,
      label: group.label || `分流 ${String.fromCharCode(65 + index)}`,
      memberCount: group.memberIds.length,
      activity: primaryRoute?.title ?? group.label,
      intensity: intensityFromLabel(group.staminaFit),
      meetingTime: meetingNode?.time ?? detail.reunion?.plannedTime,
      meetingPlace: meetingNode?.location ?? meetingNode?.title ?? detail.reunion?.meetingPoint,
      leader: leaderId ? memberNameById?.[leaderId] : undefined,
    };
  });
}

export function resolveExecuteSplitGroups(input: {
  timelineRail?: ExecuteTimelineRailSnapshot;
  resources?: ExecuteResourceItem[];
  activeSplitSession?: SplitPartySessionSummary | null;
  splitSessionDetail?: SplitPartySessionDetail | null;
  memberNameById?: Record<string, string>;
}): { groups: ExecuteSplitGroupDetail[]; reunionSummary?: string } {
  const reunionSummary = resolveReunionSummary({
    timelineRail: input.timelineRail,
    splitSessionDetail: input.splitSessionDetail,
  });

  if (input.splitSessionDetail?.groups?.length) {
    return {
      groups: mapSplitSessionGroups(input.splitSessionDetail, input.memberNameById),
      reunionSummary,
    };
  }

  if (input.activeSplitSession?.groupCount && input.activeSplitSession.groupCount >= 2) {
    return { groups: [], reunionSummary };
  }

  return { groups: [], reunionSummary };
}

export function resolveExecuteCenterRealtimeAlert(input: {
  advisory?: TripExecutionAdvisoryDto | null;
  windDescription?: string;
  hasWindWarning?: boolean;
}): ExecuteCenterRealtimeAlert | undefined {
  const description =
    input.advisory?.realtimeRisks.weather
    ?? input.windDescription
    ?? (input.hasWindWarning ? input.advisory?.verdict.headline : undefined);

  if (!description) return undefined;

  const suggestedActions: string[] = [];
  if (input.advisory?.realtimeRisks.nextCheckAt) {
    const checkAt = input.advisory.realtimeRisks.nextCheckAt;
    const parsed = new Date(checkAt.includes('T') ? checkAt : `${checkAt}T12:00:00`);
    if (isValid(parsed)) {
      suggestedActions.push(`下一次滚动更新约 ${format(parsed, 'HH:mm')}`);
    }
  }

  if (input.advisory?.recommendations[0]?.description) {
    suggestedActions.push(input.advisory.recommendations[0].description);
  }

  if (input.advisory?.recommendations.length) {
    suggestedActions.push('备选方案已准备就绪，请右侧查看');
  }

  return {
    description,
    suggestedActions: suggestedActions.length > 0 ? suggestedActions.slice(0, 3) : [],
  };
}

export function buildExecuteCenterDetailModel(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: { schedule?: { items?: ScheduleItem[] } | null; date?: string } | null;
  timelineRail?: ExecuteTimelineRailSnapshot;
  resources?: ExecuteResourceItem[];
  activeSplitSession?: SplitPartySessionSummary | null;
  splitSessionDetail?: SplitPartySessionDetail | null;
  memberNameById?: Record<string, string>;
  advisory?: TripExecutionAdvisoryDto | null;
  windDescription?: string;
  hasWindWarning?: boolean;
  formatPlaceName?: (name: string, placeId?: number) => string;
}): ExecuteCenterDetailModel {
  const timeline = resolveExecuteDayTimeline(input);
  const { groups, reunionSummary } = resolveExecuteSplitGroups({
    timelineRail: input.timelineRail,
    resources: input.resources,
    activeSplitSession: input.activeSplitSession,
    splitSessionDetail: input.splitSessionDetail,
    memberNameById: input.memberNameById,
  });
  const realtimeAlert = resolveExecuteCenterRealtimeAlert({
    advisory: input.advisory,
    windDescription: input.windDescription,
    hasWindWarning: input.hasWindWarning,
  });

  return {
    timeline,
    splitGroups: groups,
    reunionSummary,
    realtimeAlert,
  };
}

export function executeTimelineStatusLabel(status: ExecuteTimelineEntryStatus): string {
  if (status === 'done') return '已完成';
  if (status === 'current') return '进行中';
  return '待定';
}
