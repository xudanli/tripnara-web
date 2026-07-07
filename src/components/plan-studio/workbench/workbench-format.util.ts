/** 工作台展示用时长/距离格式化 */

import { DateTime } from 'luxon';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { getItineraryItemTypeDisplay, isItineraryItemType } from '@/lib/itinerary-item-type-display';
import { sortItineraryItemsForDisplay } from '@/lib/itinerary-item-sort';
import { stripSplitPlanNoteLines } from '@/lib/itinerary-split-note.util';
import { resolveItineraryItemPlaceDisplayName } from '@/lib/itinerary-place-display.util';

/** BFF 文案中嵌入的 ISO8601 时间（如 repairPlan.description） */
const ISO_DATETIME_IN_TEXT =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?/g;

/** 单条 ISO 时刻 → 工作台可读格式（目的地时区） */
export function formatIsoInstantForWorkbench(
  iso: string,
  timezone?: string,
): string | undefined {
  const parsed = DateTime.fromISO(iso, { setZone: true });
  if (!parsed.isValid) return undefined;
  const zoned = timezone?.trim() ? parsed.setZone(timezone.trim()) : parsed;
  if (!zoned.isValid) return undefined;
  return zoned.toFormat('M月d日 HH:mm');
}

/** 将 BFF 叙述文本中的 ISO 时间替换为「M月d日 HH:mm」 */
export function formatIsoDateTimesInDisplayText(
  text: string | undefined | null,
  timezone?: string,
): string {
  if (!text) return '';
  return text.replace(ISO_DATETIME_IN_TEXT, (match) => {
    return formatIsoInstantForWorkbench(match, timezone) ?? match;
  });
}

export function formatWorkbenchDurationMinutes(minutes: number | undefined | null): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '—';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function formatWorkbenchDistanceKm(km: number | undefined | null): string {
  if (km == null || !Number.isFinite(km) || km <= 0) return '—';
  if (km >= 100) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

export function formatWorkbenchOvertime(minutes: number): string {
  const sign = minutes > 0 ? '+' : '';
  return `${sign}${formatWorkbenchDurationMinutes(Math.abs(minutes))}`;
}

function collectWorkbenchPlaceNameCandidates(item: ItineraryItemDetail): string[] {
  const candidates: string[] = [];
  const fromPlace = resolveItineraryItemPlaceDisplayName(item);
  if (fromPlace) candidates.push(fromPlace);

  const noteBody = stripSplitPlanNoteLines(item.note);
  const meta = item.metadata as Record<string, unknown> | undefined;
  const metaTitle = typeof meta?.title === 'string' ? meta.title.trim() : '';
  if (metaTitle) candidates.push(metaTitle);

  const noteLine = noteBody.split('\n')[0]?.trim();
  if (noteLine) candidates.push(noteLine);

  return candidates;
}

function hasWorkbenchPlaceIdentity(item: ItineraryItemDetail): boolean {
  return collectWorkbenchPlaceNameCandidates(item).some((raw) =>
    isMeaningfulRouteSummaryStop(normalizeRouteSummaryStopName(raw)),
  );
}

/** 时间轴 POI / 活动展示名（Place.nameCN → placeName → displayName → note → 类型） */
export function resolveWorkbenchTimelineItemTitle(item: ItineraryItemDetail): string {
  for (const raw of collectWorkbenchPlaceNameCandidates(item)) {
    const name = normalizeRouteSummaryStopName(raw);
    if (isMeaningfulRouteSummaryStop(name)) return name;
  }

  const typeKey = isItineraryItemType(item.type) ? item.type : 'ACTIVITY';
  return getItineraryItemTypeDisplay(typeKey).label;
}

const HIDDEN_WORKBENCH_SPLIT_GROUP_LABELS = new Set(['攻略调整', '调整建议']);

/** 工作台时间轴是否展示 split 分组 badge（隐藏攻略导入内部标记） */
export function shouldShowWorkbenchSplitGroupLabel(label?: string | null): boolean {
  const text = label?.trim();
  if (!text) return false;
  return !HIDDEN_WORKBENCH_SPLIT_GROUP_LABELS.has(text);
}

function normalizeWorkbenchDayDate(date: string): string {
  return date.includes('T') ? date.split('T')[0]! : date;
}

const ROUTE_SUMMARY_SKIP_LABELS = new Set([
  '攻略调整',
  '分流',
  '汇合',
  '全员',
  '调整建议',
]);

function stripRouteDisplayPrefixes(text: string): string {
  return text.replace(/^[\[【][^\]】]+[\]】]\s*/g, '').trim();
}

/** 路线摘要条 POI 名：去掉 [攻略调整] 等标记，与时间轴展示一致 */
export function normalizeRouteSummaryStopName(raw: string): string {
  let name = stripRouteDisplayPrefixes(raw.trim());
  name = name.replace(/^\[攻略调整\]\s*/i, '').trim();
  name = stripRouteDisplayPrefixes(name);
  return name;
}

function isMeaningfulRouteSummaryStop(name: string): boolean {
  if (!name || name.length < 2) return false;
  if (ROUTE_SUMMARY_SKIP_LABELS.has(name)) return false;
  if (/^分组\s?[A-Z]?$/i.test(name)) return false;
  if (/^第\s?\d+\s?天/.test(name)) return false;
  return true;
}

/** 全程路线 POI 顺序（与攻略草案 routeStops 一致，供路线摘要条使用） */
export function routeStopsFromTrip(
  trip: TripDetail | null | undefined,
  itineraryByDay: Map<string, ItineraryItemDetail[]>,
): string[] {
  if (!trip?.TripDay?.length) return [];

  const stops: string[] = [];
  const seen = new Set<string>();

  for (const day of trip.TripDay) {
    const norm = normalizeWorkbenchDayDate(day.date);
    const items =
      itineraryByDay.get(norm) ??
      itineraryByDay.get(day.date) ??
      (day.ItineraryItem as ItineraryItemDetail[] | undefined) ??
      [];

    for (const item of sortItineraryItemsForDisplay(items)) {
      const typeKey = isItineraryItemType(item.type) ? item.type : 'ACTIVITY';
      if (typeKey === 'REST') continue;
      if (!hasWorkbenchPlaceIdentity(item)) continue;

      const name = resolveWorkbenchTimelineItemTitle(item).trim();
      if (!isMeaningfulRouteSummaryStop(name) || seen.has(name)) continue;
      seen.add(name);
      stops.push(name);
    }
  }

  return stops;
}
