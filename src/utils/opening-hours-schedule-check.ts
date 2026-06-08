/**
 * 按行程计划时间校验 POI 是否在营业时间内（与 ItineraryItemRow / VERIFY 展示对齐）。
 */

import { DateTime } from 'luxon';

export type OpeningHoursScheduleCheckInput = {
  rawOpeningHours: unknown;
  visitStartIso?: string | null;
  visitEndIso?: string | null;
  /** IANA 时区；缺省 UTC */
  timezone?: string;
  businessStatus?: string | null;
};

function getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function parseSeasonalHours(text: string, targetDate: Date): string | null {
  const seasonalMatch = text.match(/(夏季|春天|春季|summer|spring)[：:]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
  const winterMatch = text.match(/(冬季|冬天|winter)[：:]\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/i);
  const season = getSeason(targetDate);
  const prefixMatch = text.match(/^([^(（]+)/);
  const prefix = prefixMatch ? prefixMatch[1].trim() : '';

  if (season === 'winter' && winterMatch) {
    const hours = `${winterMatch[2]}-${winterMatch[3]}`;
    return prefix ? `${prefix} (${hours})` : hours;
  }
  if ((season === 'spring' || season === 'summer') && seasonalMatch) {
    const hours = `${seasonalMatch[2]}-${seasonalMatch[3]}`;
    return prefix ? `${prefix} (${hours})` : hours;
  }
  return text;
}

export function isAlwaysOpenHours(hours: string): boolean {
  const lower = hours.toLowerCase().trim();
  return (
    /24\s*[小时h]/i.test(hours) ||
    /24\s*\/\s*7/.test(hours) ||
    /24\s*hours?/.test(lower) ||
    /open\s+24\s*hours/.test(lower) ||
    /全年\s*24\s*小时/.test(hours) ||
    /year[- ]round/.test(lower) ||
    /全天开放/.test(hours) ||
    /open\s+all\s+day/.test(lower) ||
    /always\s+open/.test(lower) ||
    /^全天$/.test(hours.trim()) ||
    lower === 'open' ||
    lower === 'always open'
  );
}

/** 解析行程日适用的营业时间文案 */
export function resolveDayOpeningHours(rawOpeningHours: unknown, tripDate: Date): string | null {
  if (!rawOpeningHours) return null;

  if (typeof rawOpeningHours === 'string') {
    if (
      rawOpeningHours.includes('夏季') ||
      rawOpeningHours.includes('冬季') ||
      rawOpeningHours.includes('summer') ||
      rawOpeningHours.includes('winter')
    ) {
      return parseSeasonalHours(rawOpeningHours, tripDate);
    }
    return rawOpeningHours;
  }

  if (typeof rawOpeningHours !== 'object') return null;
  const openingHours = rawOpeningHours as Record<string, unknown>;

  const osm = openingHours.osmFormat ?? openingHours.osm_format;
  if (typeof osm === 'string' && osm.trim()) {
    return osm.trim();
  }

  if (openingHours.open && openingHours.close) {
    const open = String(openingHours.open).trim();
    const close = String(openingHours.close).trim();
    if (open && close) return `${open}-${close}`;
  }

  if (openingHours.text && typeof openingHours.text === 'string') {
    const text = openingHours.text;
    if (
      text.includes('夏季') ||
      text.includes('冬季') ||
      text.includes('summer') ||
      text.includes('winter')
    ) {
      return parseSeasonalHours(text, tripDate);
    }
    return text;
  }

  const dayMap: Record<number, string> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  const tripDay = tripDate.getDay();
  const dayKey = dayMap[tripDay];

  if (typeof openingHours[dayKey] === 'string') return openingHours[dayKey];
  const isWeekend = tripDay === 0 || tripDay === 6;
  if (isWeekend && typeof openingHours.weekend === 'string') return openingHours.weekend;
  if (!isWeekend && typeof openingHours.weekday === 'string') return openingHours.weekday;

  const tripDayEn = tripDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  if (typeof openingHours[tripDayEn] === 'string') return openingHours[tripDayEn];

  return null;
}

/** 与 ItineraryItemRow.formatTimeInTimezone 一致：UTC ISO → 目的地 HH:mm */
export function formatHmInDestinationTimezone(
  iso: string | null | undefined,
  timezone: string
): string | undefined {
  if (!iso?.trim()) return undefined;
  const dt = DateTime.fromISO(iso, { zone: 'UTC' }).setZone(timezone);
  return dt.isValid ? dt.toFormat('HH:mm') : undefined;
}

function parseVisitDateTime(iso: string | null | undefined, timezone: string): DateTime | null {
  if (!iso?.trim()) return null;
  const dt = DateTime.fromISO(iso, { zone: 'UTC' }).setZone(timezone);
  return dt.isValid ? dt : null;
}

export function isOpenAtScheduledTime(input: OpeningHoursScheduleCheckInput): boolean | null {
  const timezone = input.timezone?.trim() || 'UTC';
  const visitStartDt = parseVisitDateTime(input.visitStartIso, timezone);
  if (!visitStartDt) return null;

  const visitEndDt = parseVisitDateTime(input.visitEndIso, timezone);
  const tripDate = visitStartDt.toJSDate();

  if (input.businessStatus === 'CLOSED_TEMPORARILY' || input.businessStatus === 'CLOSED_PERMANENTLY') {
    return false;
  }

  if (isOpen24HourStructure(input.rawOpeningHours)) return true;

  const todayHours = resolveDayOpeningHours(input.rawOpeningHours, tripDate);
  if (!todayHours || todayHours === 'closed') return false;
  if (isAlwaysOpenHours(todayHours)) return true;

  try {
    const timeMatch = todayHours.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!timeMatch) return null;

    const [, openTime, closeTime] = timeMatch;
    const visitStartMinutes = visitStartDt.hour * 60 + visitStartDt.minute;
    const visitEndMinutes = visitEndDt
      ? visitEndDt.hour * 60 + visitEndDt.minute
      : visitStartMinutes;
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    return visitStartMinutes >= openMinutes && visitEndMinutes <= closeMinutes;
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

function pickStr(o: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function isOpen24HourStructure(raw: unknown): boolean {
  const h = asRecord(raw);
  if (!h) return false;
  const osm = pickStr(h, 'osmFormat', 'osm_format');
  if (osm && isAlwaysOpenHours(osm)) return true;
  const open = pickStr(h, 'open');
  const close = pickStr(h, 'close');
  if (open && close) {
    if (isAlwaysOpenHours(`${open}-${close}`)) return true;
    if (open === '00:00' && (close === '24:00' || close === '23:59' || close === '00:00')) {
      return true;
    }
  }
  return false;
}

export function hasUsableOpeningHours(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.keys(raw as object).length > 0;
  }
  return false;
}

/** 从 agent timeline 条目中抽取营业时间 */
export function extractOpeningHoursFromTimelineItem(item: unknown): unknown | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const o = item as Record<string, unknown>;
  const meta = asRecord(o.metadata);
  const physical = asRecord(o.physical_metadata ?? o.physicalMetadata);
  const place = asRecord(o.place ?? o.Place);
  const placeMeta = asRecord(place?.metadata);
  const placePhysical = asRecord(place?.physical_metadata ?? place?.physicalMetadata);
  const loc = asRecord(o.location_ref ?? o.locationRef);
  const locMeta = asRecord(loc?.metadata);
  const verification = asRecord(o.verification);

  return (
    physical?.openingHours ??
    physical?.opening_hours ??
    meta?.openingHours ??
    meta?.opening_hours ??
    placePhysical?.openingHours ??
    placePhysical?.opening_hours ??
    placeMeta?.openingHours ??
    placeMeta?.opening_hours ??
    locMeta?.openingHours ??
    loc?.opening_hours ??
    verification?.opening_hours ??
    verification?.openingHours
  );
}

export function extractTimelineItemName(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const o = item as Record<string, unknown>;
  const loc = asRecord(o.location_ref ?? o.locationRef);
  return (
    pickStr(loc ?? {}, 'name', 'name_cn', 'nameCn', 'name_en', 'nameEn') ??
    pickStr(o, 'title', 'name', 'itinerary_name', 'itineraryName', 'display_name', 'displayName')
  );
}

export function extractTimelineItemBusinessStatus(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const o = item as Record<string, unknown>;
  const meta = asRecord(o.metadata);
  const verification = asRecord(o.verification);
  return (
    pickStr(o, 'business_status', 'businessStatus') ??
    pickStr(meta ?? {}, 'business_status', 'businessStatus') ??
    pickStr(verification ?? {}, 'business_status', 'businessStatus')
  );
}

/** 名称模糊匹配（去空格、大小写不敏感） */
export function poiNamesMatch(a: string, b: string): boolean {
  const na = a.replace(/\s+/g, '').toLowerCase();
  const nb = b.replace(/\s+/g, '').toLowerCase();
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function parsePoiClosedIssueMessage(message: string): { poiName?: string; checkTime?: string } {
  const poiMatch = message.match(/POI\s+"([^"]+)"/) ?? message.match(/「([^」]+)」/);
  const timeMatch = message.match(/在\s*(\d{1,2}:\d{2})/);
  return {
    poiName: poiMatch?.[1]?.trim(),
    checkTime: timeMatch?.[1],
  };
}

export type TimelinePoiScheduleContext = {
  name: string;
  startWindow?: string;
  endWindow?: string;
  rawOpeningHours?: unknown;
  businessStatus?: string;
};

function extractOpeningHoursFromPlace(place: Record<string, unknown> | undefined): unknown {
  if (!place) return undefined;
  const meta = asRecord(place.metadata);
  const physical = asRecord(place.physical_metadata ?? place.physicalMetadata);
  return (
    physical?.openingHours ??
    physical?.opening_hours ??
    meta?.openingHours ??
    meta?.opening_hours
  );
}

/** 从已落库行程项收集计划时间（优先于 Agent timeline） */
export function collectTripPoiSchedulesFromItineraryItems(
  items: Array<{
    startTime?: string;
    endTime?: string;
    Place?: {
      nameCN?: string;
      nameEN?: string | null;
      metadata?: unknown;
      physicalMetadata?: unknown;
      physical_metadata?: unknown;
    } | null;
  }> | null | undefined
): TimelinePoiScheduleContext[] {
  const out: TimelinePoiScheduleContext[] = [];
  for (const item of items ?? []) {
    const place = item.Place;
    const name =
      (place?.nameCN && place.nameCN.trim()) ||
      (place?.nameEN && place.nameEN.trim()) ||
      undefined;
    if (!name) continue;
    const placeRec = place as Record<string, unknown> | undefined;
    out.push({
      name,
      startWindow: item.startTime,
      endWindow: item.endTime,
      rawOpeningHours: extractOpeningHoursFromPlace(placeRec),
      businessStatus: pickStr(asRecord(placeRec?.metadata), 'business_status', 'businessStatus'),
    });
  }
  return out;
}

/** 合并计划时间：已落库 trip 覆盖 Agent timeline 同名 POI */
export function mergePoiScheduleSources(
  tripSchedules: TimelinePoiScheduleContext[],
  timelineSchedules: TimelinePoiScheduleContext[]
): TimelinePoiScheduleContext[] {
  const byName = new Map<string, TimelinePoiScheduleContext>();

  const keyOf = (name: string) => name.replace(/\s+/g, '').toLowerCase();

  for (const s of timelineSchedules) {
    byName.set(keyOf(s.name), s);
  }
  for (const s of tripSchedules) {
    const key = keyOf(s.name);
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, s);
      continue;
    }
    byName.set(key, {
      name: s.name || prev.name,
      startWindow: s.startWindow ?? prev.startWindow,
      endWindow: s.endWindow ?? prev.endWindow,
      rawOpeningHours: s.rawOpeningHours ?? prev.rawOpeningHours,
      businessStatus: s.businessStatus ?? prev.businessStatus,
    });
  }
  return [...byName.values()];
}

/** 从 timeline 按 POI 名收集计划时间与营业时间 */
export function collectTimelinePoiSchedules(
  timelineDayBlocks: Array<{ items?: unknown[] }> | null | undefined
): TimelinePoiScheduleContext[] {
  const out: TimelinePoiScheduleContext[] = [];
  for (const day of timelineDayBlocks ?? []) {
    for (const item of day.items ?? []) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const name = extractTimelineItemName(item);
      if (!name) continue;
      out.push({
        name,
        startWindow: pickStr(o, 'start_window', 'startWindow', 'startTime', 'start_time'),
        endWindow: pickStr(o, 'end_window', 'endWindow', 'endTime', 'end_time'),
        rawOpeningHours: extractOpeningHoursFromTimelineItem(item),
        businessStatus: extractTimelineItemBusinessStatus(item),
      });
    }
  }
  return out;
}
