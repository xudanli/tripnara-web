/** 工作台展示用时长/距离格式化 */

import { DateTime } from 'luxon';
import type { ItineraryItemDetail } from '@/types/trip';
import { getItineraryItemTypeDisplay, isItineraryItemType } from '@/lib/itinerary-item-type-display';
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

/** 时间轴 POI / 活动展示名（placeName → Place.displayName → note → 类型） */
export function resolveWorkbenchTimelineItemTitle(item: ItineraryItemDetail): string {
  const fromPlace = resolveItineraryItemPlaceDisplayName(item);
  if (fromPlace) return fromPlace;

  const noteBody = stripSplitPlanNoteLines(item.note);
  const meta = item.metadata as Record<string, unknown> | undefined;
  const metaTitle = typeof meta?.title === 'string' ? meta.title.trim() : '';
  if (metaTitle) return metaTitle;

  const noteLine = noteBody.split('\n')[0]?.trim();
  if (noteLine) return noteLine;

  const typeKey = isItineraryItemType(item.type) ? item.type : 'ACTIVITY';
  return getItineraryItemTypeDisplay(typeKey).label;
}
