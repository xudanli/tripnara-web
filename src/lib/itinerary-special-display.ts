import type { CostCategory, ItineraryItem, ItineraryItemType, TripDay } from '@/types/trip';
import {
  applyHotelCrossDayDefaults,
  isAirportHubPlace,
} from '@/lib/itinerary-item-cross-day-form';

/** 时间轴特殊展示角色（写入 metadata.timelineDisplayRole） */
export type ItinerarySpecialDisplayRole =
  | 'normal'
  | 'hotel'
  | 'car_rental'
  | 'landing_point'
  | 'departure_point';

export const ITINERARY_SPECIAL_DISPLAY_ROLE_OPTIONS: Array<{
  value: ItinerarySpecialDisplayRole;
  label: string;
  description: string;
}> = [
  {
    value: 'normal',
    label: '普通行程',
    description: '常规景点、用餐等活动，按开始/结束时间展示。',
  },
  {
    value: 'hotel',
    label: '酒店住宿',
    description: '入住/退房跨天展示，可承接昨夜住宿与退房后出发。',
  },
  {
    value: 'car_rental',
    label: '租车',
    description: '取车/还车跨天展示，按租期在还车日显示还车卡。',
  },
  {
    value: 'landing_point',
    label: '落地点',
    description: '机场/车站落地，首日从此衔接交通与首个活动。',
  },
  {
    value: 'departure_point',
    label: '离境点',
    description: '末日机场/车站值机或出发，只填到港时刻，用于衔接前序交通。',
  },
];

export const TIMELINE_DISPLAY_ROLE_METADATA_KEY = 'timelineDisplayRole';

const CAR_RENTAL_HINT_RE =
  /租车|租\s*车|car\s*rental|rental\s*car|hire\s*car|取车|还车/i;

const ARRIVAL_NAME_RE =
  /机场|国际机场|航站|Airport|Terminal|火车站|高铁站|动车站|车站|枢纽|Railway|Station/i;

type RoleReadable = {
  metadata?: Record<string, unknown> | null;
  Place?: ItineraryItem['Place'];
  type?: ItineraryItemType;
  costCategory?: CostCategory | null;
  note?: string | null;
};

function readMetadata(item: RoleReadable): Record<string, unknown> {
  const raw =
    item.metadata ??
    (item as { item_metadata?: unknown }).item_metadata ??
    (item as { itemMetadata?: unknown }).itemMetadata;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

const NOTE_ROLE_RE = /\[timelineDisplayRole:([a-z_]+)\]/i;

function readRoleFromNote(note?: string | null): ItinerarySpecialDisplayRole | null {
  if (!note) return null;
  const match = note.match(NOTE_ROLE_RE);
  if (!match?.[1] || !isKnownRole(match[1])) return null;
  return match[1];
}

/** 写入 note 的展示类型标记（metadata 未持久化时的前端兜底） */
export function mergeTimelineDisplayRoleIntoNote(
  note: string | null | undefined,
  role: ItinerarySpecialDisplayRole,
): string | undefined {
  const stripped = stripTimelineDisplayRoleFromNote(note);
  if (role === 'normal') {
    return stripped || undefined;
  }
  const tagged = `${stripped}${stripped ? '\n' : ''}[timelineDisplayRole:${role}]`;
  return tagged.trim();
}

export function stripTimelineDisplayRoleFromNote(note?: string | null): string {
  return (note ?? '').replace(NOTE_ROLE_RE, '').trim();
}

function readRoleFromMetadata(meta: Record<string, unknown>): ItinerarySpecialDisplayRole | null {
  const candidates = [
    meta[TIMELINE_DISPLAY_ROLE_METADATA_KEY],
    meta.timeline_display_role,
    meta.displayRole,
    meta.display_role,
  ];
  for (const raw of candidates) {
    if (typeof raw === 'string' && isKnownRole(raw)) return raw;
  }
  return null;
}

function isKnownRole(value: string): value is ItinerarySpecialDisplayRole {
  return ITINERARY_SPECIAL_DISPLAY_ROLE_OPTIONS.some((o) => o.value === value);
}

/** 仅读取 metadata 中显式设置的角色（无推断） */
export function getExplicitItinerarySpecialDisplayRole(
  item: RoleReadable,
): ItinerarySpecialDisplayRole | null {
  const meta = readMetadata(item);
  const fromMeta = readRoleFromMetadata(meta);
  if (fromMeta) return fromMeta;
  return readRoleFromNote(item.note);
}

export function inferItinerarySpecialDisplayRole(item: RoleReadable): ItinerarySpecialDisplayRole {
  if (item.Place?.category === 'HOTEL' || item.costCategory === 'ACCOMMODATION') {
    return 'hotel';
  }

  const label = [
    item.Place?.nameCN,
    item.Place?.nameEN,
    item.note?.replace(NOTE_ROLE_RE, ''),
  ]
    .filter(Boolean)
    .join(' ');

  // 名称含「租车」优先于交通枢纽类别（避免租车门店被当成落地点）
  if (CAR_RENTAL_HINT_RE.test(label)) return 'car_rental';

  if (isAirportHubPlace(item.Place) || item.Place?.category === 'TRANSIT_HUB') {
    return 'landing_point';
  }

  if (ARRIVAL_NAME_RE.test(label)) return 'landing_point';

  const meta = readMetadata(item);
  const source = typeof meta.source === 'string' ? meta.source.toLowerCase() : '';
  if (source === 'flight' || source === 'rail') return 'landing_point';

  return 'normal';
}

/** 显式 metadata 优先，否则推断 */
export function resolveItinerarySpecialDisplayRole(item: RoleReadable): ItinerarySpecialDisplayRole {
  return getExplicitItinerarySpecialDisplayRole(item) ?? inferItinerarySpecialDisplayRole(item);
}

export function buildSpecialDisplayMetadata(
  role: ItinerarySpecialDisplayRole,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  const base = { ...(existing ?? {}) };
  if (role === 'normal') {
    delete base[TIMELINE_DISPLAY_ROLE_METADATA_KEY];
    return Object.keys(base).length > 0 ? base : undefined;
  }
  base[TIMELINE_DISPLAY_ROLE_METADATA_KEY] = role;
  return base;
}

export function itineraryRoleSupportsCrossDay(role: ItinerarySpecialDisplayRole): boolean {
  return role === 'hotel' || role === 'car_rental';
}

export function itineraryRoleUsesLandingTime(role: ItinerarySpecialDisplayRole): boolean {
  return role === 'landing_point';
}

export function itineraryRoleUsesDepartureTime(role: ItinerarySpecialDisplayRole): boolean {
  return role === 'departure_point';
}

export function itineraryRoleUsesSingleHubMoment(role: ItinerarySpecialDisplayRole): boolean {
  return role === 'landing_point' || role === 'departure_point';
}

export function getItineraryRoleStartTimeLabel(role: ItinerarySpecialDisplayRole): string {
  switch (role) {
    case 'hotel':
      return '入住时间';
    case 'car_rental':
      return '取车时间';
    case 'landing_point':
      return '落地时间';
    case 'departure_point':
      return '值机时间';
    default:
      return '开始时间';
  }
}

export function getItineraryRoleEndTimeLabel(role: ItinerarySpecialDisplayRole): string {
  switch (role) {
    case 'hotel':
      return '退房时间';
    case 'car_rental':
      return '还车时间';
    default:
      return '结束时间';
  }
}

export type SpecialDisplayRoleDefaults = {
  itemType?: ItineraryItemType;
  costCategory?: CostCategory;
  startTime?: string;
  endTime?: string;
  endTripDayId?: string;
  landingTime?: string;
  showCostFields?: boolean;
};

/** 切换特殊展示类型时的表单默认值 */
export function applySpecialDisplayRoleDefaults(
  role: ItinerarySpecialDisplayRole,
  tripDays: TripDay[],
  startTripDayId: string,
): SpecialDisplayRoleDefaults {
  const days = tripDays.length > 0 ? tripDays : [];
  const lastDay = days[days.length - 1];

  switch (role) {
    case 'hotel': {
      const defaults = applyHotelCrossDayDefaults(days, startTripDayId);
      return {
        itemType: 'REST',
        costCategory: 'ACCOMMODATION',
        startTime: defaults.startTime,
        endTime: defaults.endTime,
        endTripDayId: defaults.endTripDayId,
        showCostFields: true,
      };
    }
    case 'car_rental':
      return {
        itemType: 'TRANSIT',
        costCategory: 'TRANSPORTATION',
        startTime: '09:00',
        endTime: '10:00',
        endTripDayId: lastDay?.id ?? startTripDayId,
        showCostFields: true,
      };
    case 'landing_point':
      return {
        itemType: 'TRANSIT',
        landingTime: '10:00',
        startTime: '10:00',
        endTime: '10:30',
        endTripDayId: startTripDayId,
      };
    case 'departure_point':
      return {
        itemType: 'TRANSIT',
        landingTime: '14:00',
        startTime: '14:00',
        endTime: '14:30',
        endTripDayId: startTripDayId,
      };
    default:
      return {};
  }
}

export function isItineraryLandingPointDisplay(
  item: RoleReadable & { type?: ItineraryItemType },
): boolean {
  const resolved = resolveItinerarySpecialDisplayRole(item);
  if (resolved === 'car_rental' || resolved === 'hotel' || resolved === 'departure_point') {
    return false;
  }
  if (resolved === 'landing_point') return true;
  return false;
}

export function isItineraryDeparturePointDisplay(
  item: RoleReadable & { type?: ItineraryItemType },
): boolean {
  return resolveItinerarySpecialDisplayRole(item) === 'departure_point';
}

export function isItineraryCarRentalDisplay(
  item: RoleReadable & { type?: ItineraryItemType },
): boolean {
  return resolveItinerarySpecialDisplayRole(item) === 'car_rental';
}

export function normalizeTripDayDateKey(date: string): string {
  return date.includes('T') ? date.split('T')[0] : date;
}

/** 根据 endTime 匹配行程日（用于编辑跨天结束日） */
export function findTripDayIdForIsoEnd(
  endTimeIso: string | undefined | null,
  tripDays: TripDay[],
): string | undefined {
  if (!endTimeIso || tripDays.length === 0) return undefined;
  const endKey = endTimeIso.includes('T') ? endTimeIso.split('T')[0] : endTimeIso;
  const match = tripDays.find(
    (d) => normalizeTripDayDateKey(d.date) === endKey || d.date === endKey,
  );
  return match?.id;
}
