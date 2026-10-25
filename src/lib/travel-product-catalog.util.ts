import { DateTime } from 'luxon';
import type { TravelProductOffering, TravelProductSession } from '@/types/travel-products';

const BLOCKED_SESSION_STATUSES = new Set(['CANCELLED', 'WEATHER_HOLD']);

/** localDate → YYYY-MM-DD */
export function travelProductLocalDateKey(localDate: string | null | undefined): string {
  if (!localDate) return '';
  return localDate.slice(0, 10);
}

/** 班次当地 HH:mm + 日期 + 时区 → UTC ISO */
export function travelProductLocalHmToUtcIso(input: {
  localDate: string;
  hm: string;
  timezone?: string | null;
}): string | null {
  const dateKey = travelProductLocalDateKey(input.localDate);
  const hm = input.hm.trim();
  const match = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!dateKey || !match) return null;
  const zone = input.timezone?.trim() || 'utc';
  const dt = DateTime.fromObject(
    {
      year: Number(dateKey.slice(0, 4)),
      month: Number(dateKey.slice(5, 7)),
      day: Number(dateKey.slice(8, 10)),
      hour: Number(match[1]),
      minute: Number(match[2]),
      second: 0,
      millisecond: 0,
    },
    { zone },
  );
  if (!dt.isValid) return null;
  return dt.toUTC().toISO();
}

export function isBookableTravelProductSession(session: TravelProductSession): boolean {
  const status = (session.status ?? '').toUpperCase();
  if (BLOCKED_SESSION_STATUSES.has(status)) return false;
  if (session.capacityRemaining != null && session.capacityRemaining <= 0) return false;
  return true;
}

export function pickMeetingPointPlaceId(offering: TravelProductOffering): number | undefined {
  const links = offering.placeLinks ?? [];
  const meeting = links.find((link) => link.role === 'MEETING_POINT');
  if (meeting?.placeId != null) return meeting.placeId;
  const fallback = links.find((link) => link.placeId != null);
  return fallback?.placeId;
}

/** 列表项上的体验定义 id / 展示名 */
export function resolvePlaceExperienceRow(item: {
  experienceDefinitionId?: string;
  displayNameZh?: string | null;
  displayNameEn?: string | null;
  isFeatured?: boolean;
  experience?: {
    id?: string;
    displayNameZh?: string | null;
    displayNameEn?: string | null;
    typicalDurationMin?: number | null;
  } | null;
}): {
  experienceDefinitionId: string;
  displayNameZh: string;
  typicalDurationMin?: number;
  isFeatured: boolean;
} | null {
  const experienceDefinitionId =
    item.experienceDefinitionId?.trim() || item.experience?.id?.trim() || '';
  if (!experienceDefinitionId) return null;
  const displayNameZh =
    item.displayNameZh?.trim() ||
    item.experience?.displayNameZh?.trim() ||
    item.displayNameEn?.trim() ||
    item.experience?.displayNameEn?.trim() ||
    experienceDefinitionId;
  const typicalDurationMin =
    item.experience?.typicalDurationMin != null
      ? item.experience.typicalDurationMin
      : undefined;
  return {
    experienceDefinitionId,
    displayNameZh,
    typicalDurationMin,
    isFeatured: Boolean(item.isFeatured),
  };
}

/** 行程日 YYYY-MM-DD + 当地 HH:mm + 时区 → UTC ISO（无班次时创建体验项） */
export function travelProductDayHmToUtcIso(input: {
  dayDate: string;
  hm: string;
  timezone?: string | null;
}): string | null {
  return travelProductLocalHmToUtcIso({
    localDate: input.dayDate,
    hm: input.hm,
    timezone: input.timezone,
  });
}

export function buildTravelProductActivityNote(input: {
  arriveLocal?: string | null;
  hasFallbackPlan?: boolean;
}): string | undefined {
  const arriveLocal = input.arriveLocal?.trim();
  const payload: Record<string, unknown> = {};
  if (arriveLocal) payload.arriveLocal = arriveLocal;
  if (input.hasFallbackPlan) payload.hasFallbackPlan = true;
  if (Object.keys(payload).length === 0) return undefined;
  return JSON.stringify(payload);
}

/** 用班次生成行程项 start/end（活动窗，优先 start/end；缺省用 meet） */
export function buildTravelProductActivityWindow(session: TravelProductSession): {
  startTimeIso: string | null;
  endTimeIso: string | null;
  meetTimeLocal?: string;
} {
  const tz = session.timezone;
  const startHm = session.startTimeLocal ?? session.meetTimeLocal;
  const endHm = session.endTimeLocal ?? session.startTimeLocal ?? session.meetTimeLocal;
  return {
    startTimeIso: startHm
      ? travelProductLocalHmToUtcIso({ localDate: session.localDate, hm: startHm, timezone: tz })
      : null,
    endTimeIso: endHm
      ? travelProductLocalHmToUtcIso({ localDate: session.localDate, hm: endHm, timezone: tz })
      : null,
    meetTimeLocal: session.meetTimeLocal?.trim() || undefined,
  };
}

export function formatTravelProductOfferingSubtitle(offering: TravelProductOffering): string {
  const parts: string[] = [];
  if (offering.operator?.brandName) parts.push(offering.operator.brandName);
  const typeLabel =
    offering.experienceDefinition?.displayNameZh ??
    offering.subtypeCode ??
    offering.categoryCode;
  if (typeLabel) parts.push(typeLabel);
  if (offering.defaultDurationMin != null) parts.push(`${offering.defaultDurationMin} 分钟`);
  if (offering.minAge != null) parts.push(`${offering.minAge}+`);
  if (offering.fitnessRequirement) parts.push(offering.fitnessRequirement);
  return parts.join(' · ');
}
