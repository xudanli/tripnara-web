import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';
import type { PlanStudioScheduleNavigateDetail } from '@/lib/plan-studio-schedule-navigation';
import type { ItineraryChangeType, ItineraryDiffEntry } from '@/types/feasibility-repair';

function normalizeDiffEntry(raw: Record<string, unknown>): ItineraryDiffEntry {
  const before = raw.before as Record<string, unknown> | undefined;
  const after = raw.after as Record<string, unknown> | undefined;
  return {
    slotId: String(raw.slotId ?? raw.slot_id ?? ''),
    changeType: String(raw.changeType ?? raw.change_type ?? 'title_changed') as ItineraryChangeType,
    dayNumber: Number(raw.dayNumber ?? raw.day_number ?? 0),
    before: before
      ? {
          title: before.title as string | undefined,
          time: (before.time ?? before.startTime) as string | undefined,
          endTime: (before.endTime ?? before.end_time) as string | undefined,
          dayNumber: before.dayNumber != null ? Number(before.dayNumber) : undefined,
        }
      : undefined,
    after: after
      ? {
          title: after.title as string | undefined,
          time: (after.time ?? after.startTime) as string | undefined,
          endTime: (after.endTime ?? after.end_time) as string | undefined,
          dayNumber: after.dayNumber != null ? Number(after.dayNumber) : undefined,
        }
      : undefined,
  };
}

function readDiffRowsFromRepairPreview(
  repairPreview: Record<string, unknown> | undefined,
): ItineraryDiffEntry[] {
  if (!repairPreview) return [];
  const raw = (repairPreview.itineraryDiff ?? repairPreview.itinerary_diff) as
    | Record<string, unknown>[]
    | undefined;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(normalizeDiffEntry).filter((row) => row.slotId || row.before || row.after);
}

function readDayNumberFromSnapshot(snapshot: unknown): number | undefined {
  if (!snapshot || typeof snapshot !== 'object') return undefined;
  const record = snapshot as Record<string, unknown>;
  const dayNumber = Number(record.dayNumber ?? record.day_number ?? 0);
  return dayNumber >= 1 ? dayNumber : undefined;
}

function readHighlightsFromSnapshot(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const record = snapshot as Record<string, unknown>;
  if (!Array.isArray(record.highlights)) return [];
  return record.highlights.map(String).filter(Boolean);
}

/** 从决策 preview.repairPreview 提取行程 diff（无数据时返回空数组） */
export function extractItineraryDiffFromDecisionPreview(
  preview: GatewayDecisionPreviewResult | null | undefined,
): ItineraryDiffEntry[] {
  if (!preview?.repairPreview) return [];
  return readDiffRowsFromRepairPreview(preview.repairPreview);
}

/** 从 diff / repairPreview 快照推断时间轴深链 */
export function resolveScheduleNavigationFromDecisionPreview(input: {
  preview?: GatewayDecisionPreviewResult | null;
  itineraryDiff?: ItineraryDiffEntry[];
}): PlanStudioScheduleNavigateDetail | null {
  const diff = input.itineraryDiff ?? extractItineraryDiffFromDecisionPreview(input.preview);
  if (diff.length > 0) {
    const dayNumbers = diff
      .map((row) => row.dayNumber || row.after?.dayNumber || row.before?.dayNumber)
      .filter((value): value is number => typeof value === 'number' && value >= 1);
    const highlightItemIds = diff.map((row) => row.slotId).filter(Boolean);
    const dayNumber = dayNumbers[0];
    if (dayNumber || highlightItemIds.length) {
      return {
        dayNumber,
        highlightItemIds: highlightItemIds.length ? highlightItemIds : undefined,
      };
    }
  }

  const repair = input.preview?.repairPreview;
  if (!repair) return null;

  const afterDay = readDayNumberFromSnapshot(repair.after ?? repair.after_snapshot);
  const beforeDay = readDayNumberFromSnapshot(repair.before ?? repair.before_snapshot);
  const highlights = [
    ...readHighlightsFromSnapshot(repair.after ?? repair.after_snapshot),
    ...readHighlightsFromSnapshot(repair.before ?? repair.before_snapshot),
  ];

  const dayNumber = afterDay ?? beforeDay;
  if (!dayNumber && highlights.length === 0) return null;

  return {
    dayNumber,
    highlightItemIds: highlights.length ? [...new Set(highlights)] : undefined,
  };
}
