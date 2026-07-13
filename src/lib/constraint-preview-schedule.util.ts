import type {
  ConstraintEditorDraft,
  ConstraintImpactAffectedDayDetail,
  ConstraintImpactPreview,
} from '@/components/plan-studio/workbench/constraint-console-types';
import { sortItineraryItemsForDisplay } from '@/lib/itinerary-item-sort';
import { extractHmFromWindow } from '@/lib/itinerary-item-card-format';
import { decimalHoursToTimeString } from '@/lib/constraint-catalog-editor.util';
import { resolveCatalogHardTemplateId } from '@/components/plan-studio/workbench/CatalogHardConstraintFields';
import type { ItineraryItem } from '@/types/trip';
import type { TripDetail } from '@/types/trip';

function resolveTripTimezone(trip?: TripDetail | null): string | undefined {
  const meta = trip?.metadata as Record<string, unknown> | undefined;
  const tz = meta?.timezone ?? meta?.timeZone ?? meta?.destinationTimezone;
  return typeof tz === 'string' && tz.trim() ? tz.trim() : undefined;
}

function hmToMinutes(hm: string): number | null {
  const match = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export interface ScheduleTimeViolationItem {
  itemId?: string;
  label: string;
  startTimeLabel: string;
}

export interface ScheduleTimeViolationDay {
  dayNumber: number;
  items: ScheduleTimeViolationItem[];
}

function resolveItemLabel(item: ItineraryItem): string {
  return item.Place?.nameCN ?? item.Place?.nameEN ?? (item.note?.trim() || '未命名活动');
}

function collectViolatingItemsForDay(
  items: ItineraryItem[],
  templateId: 'earliest_departure' | 'latest_end',
  constraintMinutes: number,
  timezone?: string,
): ScheduleTimeViolationItem[] {
  const sorted = sortItineraryItemsForDisplay(items);
  const violating: ScheduleTimeViolationItem[] = [];

  for (const item of sorted) {
    if (!item.startTime) continue;
    const startLabel = extractHmFromWindow(item.startTime, timezone);
    if (!startLabel) continue;
    const startMinutes = hmToMinutes(startLabel);
    if (startMinutes == null) continue;

    const violates =
      templateId === 'earliest_departure'
        ? startMinutes < constraintMinutes
        : startMinutes > constraintMinutes;

    if (!violates) continue;

    violating.push({
      itemId: item.id,
      label: resolveItemLabel(item),
      startTimeLabel: startLabel,
    });
  }

  return violating;
}

export function computeTimeWindowScheduleViolations(
  draft: ConstraintEditorDraft,
  trip?: TripDetail | null,
): {
  templateId: 'earliest_departure' | 'latest_end' | null;
  constraintLabel: string;
  constraintTimeLabel: string;
  violatingDays: ScheduleTimeViolationDay[];
} | null {
  const templateId = resolveCatalogHardTemplateId(draft);
  if (templateId !== 'earliest_departure' && templateId !== 'latest_end') return null;
  if (!trip?.TripDay?.length) return null;

  const constraintMinutes = Math.round(draft.targetValue * 60);
  const timezone = resolveTripTimezone(trip);
  const violatingDays: ScheduleTimeViolationDay[] = [];

  trip.TripDay.forEach((day, index) => {
    const items = collectViolatingItemsForDay(
      day.ItineraryItem ?? [],
      templateId,
      constraintMinutes,
      timezone,
    );
    if (items.length === 0) return;
    violatingDays.push({ dayNumber: index + 1, items });
  });

  return {
    templateId,
    constraintLabel: draft.name,
    constraintTimeLabel: decimalHoursToTimeString(draft.targetValue),
    violatingDays,
  };
}

function formatDayList(days: number[]): string {
  if (days.length <= 4) return days.map((d) => `第 ${d} 天`).join('、');
  return `第 ${days.slice(0, 3).join('、')} 天等 ${days.length} 天`;
}

/** 过滤 preview 中误传的 year / 越界 dayNumber（如 2026） */
export function sanitizePreviewAffectedDays<T extends { dayNumber: number }>(
  days: T[],
  options?: { maxDay?: number },
): T[] {
  const cap = options?.maxDay ?? 90;
  const seen = new Set<number>();
  const sanitized: T[] = [];
  for (const day of days) {
    const dayNumber = Math.round(Number(day.dayNumber));
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > cap) continue;
    if (seen.has(dayNumber)) continue;
    seen.add(dayNumber);
    sanitized.push(dayNumber === day.dayNumber ? day : { ...day, dayNumber });
  }
  return sanitized;
}

export function resolvePreviewMaxTripDay(trip?: TripDetail | null): number | undefined {
  const count = trip?.TripDay?.length;
  return count && count > 0 ? count : undefined;
}

function shouldSupplementBackendPreview(preview: ConstraintImpactPreview): boolean {
  if (preview.refreshType === 'deep' && preview.structuredImpact?.schedule) return false;
  const weakSummary = preview.diffBullets.some((line) => /影响较小|暂无显著/.test(line));
  const noScoreChange = (preview.executeabilityDelta?.scoreDelta ?? 0) === 0;
  return weakSummary || noScoreChange || preview.affectedDays.length === 0;
}

function buildAffectedDayDetails(
  violatingDays: ScheduleTimeViolationDay[],
  templateId: 'earliest_departure' | 'latest_end',
  constraintTimeLabel: string,
): ConstraintImpactAffectedDayDetail[] {
  const ruleDetail =
    templateId === 'earliest_departure'
      ? (start: string) => `${start} 出发，早于最早出发 ${constraintTimeLabel}`
      : (start: string) => `${start} 结束，晚于最晚结束 ${constraintTimeLabel}`;

  return violatingDays.map((day, index) => ({
    dayNumber: day.dayNumber,
    tone: (index === 0 ? 'major' : 'minor') as 'major' | 'minor',
    items: day.items.map((item) => ({
      itemId: item.itemId,
      label: item.label,
      startTimeLabel: item.startTimeLabel,
      detail: ruleDetail(item.startTimeLabel),
    })),
  }));
}

/** 将 poisToRelocate 等后端字段转为按天详情 */
export function buildAffectedDayDetailsFromStructuredImpact(
  preview: ConstraintImpactPreview,
): ConstraintImpactAffectedDayDetail[] | undefined {
  const pois = preview.structuredImpact?.schedule?.poisToRelocate;
  if (!pois?.length) return preview.affectedDayDetails;

  const byDay = new Map<number, ConstraintImpactAffectedDayDetail['items']>();
  for (const poi of pois) {
    const dayNumber = poi.dayNumber;
    if (dayNumber == null) continue;
    const items = byDay.get(dayNumber) ?? [];
    items.push({
      itemId: poi.itemId,
      label: poi.label ?? poi.itemId ?? '未命名景点',
      detail: '可能需要移动或移除',
    });
    byDay.set(dayNumber, items);
  }

  if (byDay.size === 0) return preview.affectedDayDetails;

  const toneByDay = new Map(preview.affectedDays.map((day) => [day.dayNumber, day.tone]));
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, items]) => ({
      dayNumber,
      tone: toneByDay.get(dayNumber) ?? 'minor',
      items,
    }));
}

/** 后端 quick 预览未对照日程时，用本地行程补全 time_window 影响 */
export function enrichConstraintImpactPreviewWithSchedule(
  preview: ConstraintImpactPreview,
  draft: ConstraintEditorDraft,
  trip?: TripDetail | null,
): ConstraintImpactPreview {
  const analysis = computeTimeWindowScheduleViolations(draft, trip);
  if (!analysis || analysis.violatingDays.length === 0) {
    const fromBackend = buildAffectedDayDetailsFromStructuredImpact(preview);
    const maxDay = resolvePreviewMaxTripDay(trip);
    const next = fromBackend ? { ...preview, affectedDayDetails: fromBackend } : preview;
    return {
      ...next,
      affectedDays: sanitizePreviewAffectedDays(next.affectedDays, { maxDay }),
      affectedDayDetails: sanitizePreviewAffectedDays(next.affectedDayDetails ?? [], {
        maxDay,
      }),
    };
  }
  if (!shouldSupplementBackendPreview(preview)) {
    const fromBackend = buildAffectedDayDetailsFromStructuredImpact(preview);
    const maxDay = resolvePreviewMaxTripDay(trip);
    return {
      ...(fromBackend ? { ...preview, affectedDayDetails: fromBackend } : preview),
      affectedDays: sanitizePreviewAffectedDays(preview.affectedDays, { maxDay }),
      affectedDayDetails: sanitizePreviewAffectedDays(
        fromBackend ?? preview.affectedDayDetails ?? [],
        { maxDay },
      ),
    };
  }

  const { templateId, constraintTimeLabel, violatingDays } = analysis;
  const dayNumbers = violatingDays.map((d) => d.dayNumber);
  const affectedDayDetails = buildAffectedDayDetails(violatingDays, templateId, constraintTimeLabel);
  const ruleVerb =
    templateId === 'earliest_departure'
      ? `早于最早出发 ${constraintTimeLabel}`
      : `晚于最晚结束 ${constraintTimeLabel}`;

  const summaryBullet =
    dayNumbers.length === trip?.TripDay?.length
      ? `整趟 ${dayNumbers.length} 天均有活动${ruleVerb}，需整体后移或调整约束`
      : `${formatDayList(dayNumbers)} 有活动${ruleVerb}，需调整出发时刻或相关安排`;

  const affectedDays = affectedDayDetails.map((day) => ({
    dayNumber: day.dayNumber,
    tone: day.tone ?? 'minor',
  }));

  const majorCount = affectedDays.filter((d) => d.tone === 'major').length;
  const minorCount = affectedDays.filter((d) => d.tone === 'minor').length;

  const diffBullets = preview.diffBullets.filter((line) => !/影响较小|暂无显著/.test(line));

  const recommendations = [
    templateId === 'earliest_departure'
      ? `建议将受影响日期的首项活动不早于 ${constraintTimeLabel}，或重新评估最早出发时间`
      : `建议将受影响日期的结束安排不晚于 ${constraintTimeLabel}`,
    ...(preview.recommendations ?? []).filter((line) => !/影响较小|assess 读模型|轻量变更/.test(line)),
  ];

  return {
    ...preview,
    affectedDays,
    affectedDayDetails,
    affectedItemIds:
      preview.affectedItemIds ??
      violatingDays.flatMap((day) => day.items.map((item) => item.itemId).filter(Boolean) as string[]),
    adjustmentSummary: `${majorCount} 处主要调整，${minorCount} 处次要调整 · ${dayNumbers.length} 天日程需对齐`,
    planNeedsAdjust: true,
    diffBullets: [...new Set(diffBullets)],
    recommendation: recommendations[0],
    recommendations: [...new Set(recommendations)],
    structuredImpact: {
      ...preview.structuredImpact,
      summaryBullets: [summaryBullet, ...(preview.structuredImpact?.summaryBullets ?? [])].filter(
        (line, index, arr) => arr.indexOf(line) === index,
      ),
      schedule: {
        ...preview.structuredImpact?.schedule,
        daysNeedingSplit: dayNumbers,
        poisToRelocate: violatingDays.flatMap((day) =>
          day.items.map((item) => ({
            dayNumber: day.dayNumber,
            itemId: item.itemId,
            label: item.label,
          })),
        ),
      },
    },
  };
}
