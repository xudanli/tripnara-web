import { format, isValid } from 'date-fns';
import { formatScheduleTime, formatScheduleTimeRange } from '@/lib/itinerary-item-card-format';
import type { SplitGroupInfo } from '@/components/execute/live/ExecuteCenterPanels';
import type { ExecuteResourceItem } from '@/lib/execute-status-sidebar.util';
import type { ExecuteTimelineRailSnapshot } from '@/lib/execute-center.util';
import type { SplitPartySessionSummary } from '@/types/in-trip-split';
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

const DEMO_TIMELINE: ExecuteDayTimelineEntry[] = [
  { id: '1', timeLabel: '08:30', title: '从伊萨菲厄泽 出发', detail: '120 km · 2h 05m', status: 'done' },
  { id: '2', timeLabel: '10:35', title: '霍尔斯穆尔悬崖 观景', detail: '休息，拍照 30m', status: 'done' },
  { id: '3', timeLabel: '11:05', title: '丁基达尔斯村 补给 · 加油', detail: '休息 20m', status: 'done' },
  { id: '4', timeLabel: '12:30', title: '冰川徒步体验 (IceFlow)', detail: '预计 3h · 中等强度', status: 'current' },
  { id: '5', timeLabel: '16:30', title: '丁基达尔斯村 集合', detail: '分流队伍汇合 · 装备整理', status: 'upcoming' },
  { id: '6', timeLabel: '17:00', title: '前往 布迪尔温泉', detail: '80 km · 1h 20m', status: 'upcoming' },
  { id: '7', timeLabel: '18:30', title: '温泉 & 晚餐', detail: '布迪尔温泉', status: 'upcoming' },
  { id: '8', timeLabel: '21:00', title: '入住 Hotel Breidavik', detail: '休息', status: 'upcoming' },
];

const DEMO_SPLIT_GROUPS: ExecuteSplitGroupDetail[] = [
  {
    id: 'a',
    label: '分流 A / 徒步组',
    memberCount: 4,
    activity: '冰川徒步体验 (IceFlow)',
    intensity: 'medium',
    meetingTime: '16:30',
    meetingPlace: '丁基达尔斯村停车场',
    leader: 'Patriksjor（向导）',
    transportNote: '当前车辆继续执行',
    gearStatus: '4/4 已准备',
  },
  {
    id: 'b',
    label: '分流 B / 休息组',
    memberCount: 2,
    activity: '咖啡馆 / 酒店休息',
    intensity: 'low',
    meetingTime: '16:30',
    meetingPlace: 'Kaffi Túnid',
    leader: 'Abu',
    transportNote: '当前车辆折返接驳',
    comfortRating: '4/5',
  },
];

const DEMO_REUNION = '统一汇合：16:30 丁基达尔斯村停车场 → 17:00 前往布迪尔温泉';

const DEMO_ALERT: ExecuteCenterRealtimeAlert = {
  description:
    '受强风影响，冰川营地一带阵风预计持续至 14:00，风速最高可达 24 m/s。冰川徒步存在安全风险，可能需要延期或改为 Plan B。',
  suggestedActions: [
    '密切关注 30 分钟滚动更新',
    '导游将在 11:45 前给出最终建议',
    '备选方案已准备就绪，请右侧查看',
  ],
};

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
  if (items.length === 0) return DEMO_TIMELINE;

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

export function resolveExecuteSplitGroups(input: {
  timelineRail?: ExecuteTimelineRailSnapshot;
  resources?: ExecuteResourceItem[];
  activeSplitSession?: SplitPartySessionSummary | null;
  memberNameById?: Record<string, string>;
}): { groups: ExecuteSplitGroupDetail[]; reunionSummary?: string } {
  const { gathering } = input.timelineRail ?? { gathering: {} };
  const reunionParts: string[] = [];
  if (gathering.time || gathering.place) {
    reunionParts.push([gathering.time, gathering.place ? `${gathering.place}停车场` : null].filter(Boolean).join(' '));
  }
  if (gathering.destination) {
    reunionParts.push(gathering.destination.replace(/^统一前往/, '前往'));
  }
  const reunionSummary = reunionParts.length >= 2
    ? `统一汇合：${reunionParts.join(' → ')}`
    : reunionParts.length === 1
      ? `统一汇合：${reunionParts[0]}`
      : DEMO_REUNION;

  if (input.activeSplitSession && input.activeSplitSession.groupCount >= 2) {
    return {
      groups: DEMO_SPLIT_GROUPS.map((group, index) => ({
        ...group,
        memberCount: Math.max(1, Math.floor(input.activeSplitSession!.groupCount / (index + 1))),
      })),
      reunionSummary,
    };
  }

  const activityResource = input.resources?.find((r) => r.category === 'activity');
  const hasSplitHint = gathering.time || gathering.place || activityResource;

  if (!hasSplitHint) {
    return { groups: DEMO_SPLIT_GROUPS, reunionSummary: DEMO_REUNION };
  }

  const trekGroup: ExecuteSplitGroupDetail = {
    id: 'trek',
    label: '分流 A / 徒步组',
    memberCount: 4,
    activity: activityResource?.title ?? '冰川徒步体验 (IceFlow)',
    intensity: 'medium',
    meetingTime: gathering.time,
    meetingPlace: gathering.place,
    leader: 'Patriksjor（向导）',
    transportNote: '当前车辆继续执行',
    gearStatus: activityResource?.statusLabel === '已确认' ? '4/4 已准备' : undefined,
  };

  const restGroup: ExecuteSplitGroupDetail = {
    id: 'rest',
    label: '分流 B / 休息组',
    memberCount: 2,
    activity: '咖啡馆 / 酒店休息',
    intensity: 'low',
    meetingTime: gathering.time,
    meetingPlace: gathering.place ?? 'Kaffi Túnid',
    leader: 'Abu',
    transportNote: '当前车辆折返接驳',
    comfortRating: '4/5',
  };

  return { groups: [trekGroup, restGroup], reunionSummary };
}

export function resolveExecuteCenterRealtimeAlert(input: {
  advisory?: TripExecutionAdvisoryDto | null;
  windDescription?: string;
  hasWindWarning?: boolean;
}): ExecuteCenterRealtimeAlert | undefined {
  const description =
    input.advisory?.realtimeRisks.weather
    ?? input.windDescription
    ?? (input.hasWindWarning ? DEMO_ALERT.description : undefined);

  if (!description) return undefined;

  const suggestedActions: string[] = [];
  if (input.advisory?.realtimeRisks.nextCheckAt) {
    const checkAt = input.advisory.realtimeRisks.nextCheckAt;
    const parsed = new Date(checkAt.includes('T') ? checkAt : `${checkAt}T12:00:00`);
    if (isValid(parsed)) {
      suggestedActions.push(`下一次滚动更新约 ${format(parsed, 'HH:mm')}`);
    } else {
      suggestedActions.push('密切关注 30 分钟滚动更新');
    }
  } else {
    suggestedActions.push('密切关注 30 分钟滚动更新');
  }

  if (input.advisory?.recommendations[0]?.description) {
    suggestedActions.push(input.advisory.recommendations[0].description);
  } else {
    suggestedActions.push('导游将在 11:45 前给出最终建议');
  }

  if (input.advisory?.recommendations.length) {
    suggestedActions.push('备选方案已准备就绪，请右侧查看');
  } else {
    suggestedActions.push('备选方案已准备就绪，请右侧查看');
  }

  return { description, suggestedActions: suggestedActions.slice(0, 3) };
}

export function buildExecuteCenterDetailModel(input: {
  trip?: TripDetail | null;
  tripState?: TripState | null;
  todaySchedule?: { schedule?: { items?: ScheduleItem[] } | null; date?: string } | null;
  timelineRail?: ExecuteTimelineRailSnapshot;
  resources?: ExecuteResourceItem[];
  activeSplitSession?: SplitPartySessionSummary | null;
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
