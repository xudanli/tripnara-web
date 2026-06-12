import type { RouteAndRunResponse } from '@/api/agent';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import type {
  ItineraryAdjustDraftPreview,
  ItineraryAdjustResult,
} from '@/lib/itinerary-adjust-response';
import {
  normalizeItineraryAdjustDateIso,
  resolveItineraryAdjustScheduleDays,
} from '@/lib/itinerary-adjust-response';

/** POST route_and_run options.apply_itinerary_adjust_draft 时的 message */
export const ITINERARY_ADJUST_APPLY_DRAFT_ROUTE_MESSAGE = '应用到行程';

export type ItineraryAdjustApplyMode = 'replace_day' | 'append_sparse_days';

/** 与后端 DTO 对齐：单日 replace_day 或 POI_SLOT_FILL 多稀疏日 append_sparse_days */
export interface ItineraryAdjustDraftDaySnapshot {
  date_iso: string;
  day_number?: number;
  items: unknown[];
}

export interface ItineraryAdjustDraftSnapshot {
  /** 默认 `replace_day`；POI_SLOT_FILL 多稀疏日为 `append_sparse_days` */
  apply_mode?: ItineraryAdjustApplyMode;
  /** append_sparse_days：只追加、不删除 */
  days?: ItineraryAdjustDraftDaySnapshot[];
  target_date_iso: string;
  target_day_number?: number;
  /** replace_day 单日条目（与 days 单元素互斥，后端均支持） */
  items?: unknown[];
}

const POI_SLOT_FILL_SUB_INTENT = 'POI_SLOT_FILL';

export function extractItineraryAdjustSubIntent(
  metadata?: Record<string, unknown> | null
): string | undefined {
  if (!metadata) return undefined;
  const raw = metadata.sub_intent ?? metadata.subIntent ?? metadata.itinerary_adjust_sub_intent;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function isItineraryAdjustMultiDayAppend(
  timelineDayBlocks: ItineraryDayItemsBlock[] | undefined,
  metadata?: Record<string, unknown> | null
): boolean {
  const subIntent = extractItineraryAdjustSubIntent(metadata);
  if (subIntent === POI_SLOT_FILL_SUB_INTENT) return true;
  const daysWithItems = (timelineDayBlocks ?? []).filter((d) => (d.items?.length ?? 0) > 0);
  return daysWithItems.length > 1;
}

function collectSparseDaySnapshots(
  blocks: ItineraryDayItemsBlock[]
): ItineraryAdjustDraftDaySnapshot[] {
  return blocks
    .filter((d) => (d.items?.length ?? 0) > 0)
    .map((d, idx) => {
      const dateIso = normalizeItineraryAdjustDateIso(d.date);
      if (!dateIso) return null;
      const dayNumber =
        typeof (d as { dayNumber?: number }).dayNumber === 'number'
          ? (d as { dayNumber?: number }).dayNumber
          : idx + 1;
      return {
        date_iso: dateIso,
        day_number: dayNumber,
        items: d.items ?? [],
      };
    })
    .filter((d): d is ItineraryAdjustDraftDaySnapshot => d != null);
}

export function extractRouteRunDurableTripRunId(
  response: RouteAndRunResponse
): string | undefined {
  const obs = response.observability?.durable_trip_run_id;
  if (typeof obs === 'string' && obs.trim()) return obs.trim();

  const metaObs = response.meta?.observability as { durable_trip_run_id?: string | null } | undefined;
  if (typeof metaObs?.durable_trip_run_id === 'string' && metaObs.durable_trip_run_id.trim()) {
    return metaObs.durable_trip_run_id.trim();
  }

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const durableRaw = payload?.durable ?? payload?.Durable;
  if (durableRaw && typeof durableRaw === 'object' && !Array.isArray(durableRaw)) {
    const d = durableRaw as Record<string, unknown>;
    const id = d.trip_run_id ?? d.tripRunId;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }

  return undefined;
}

export function buildItineraryAdjustDraftSnapshot(options: {
  preview?: ItineraryAdjustDraftPreview | null;
  adjustResult?: ItineraryAdjustResult;
  timelineDayBlocks?: ItineraryDayItemsBlock[];
  metadata?: Record<string, unknown> | null;
}): ItineraryAdjustDraftSnapshot | null {
  const blocks = options.preview?.timelineDayBlocks ?? options.timelineDayBlocks;
  if (!blocks?.length) return null;

  const metadata = options.metadata ?? options.preview?.metadata;
  const multiDayAppend =
    options.preview?.multiDayAppend === true ||
    isItineraryAdjustMultiDayAppend(blocks, metadata);

  if (multiDayAppend) {
    const daySnapshots = collectSparseDaySnapshots(blocks);
    if (!daySnapshots.length) return null;
    const head = daySnapshots[0];
    return {
      apply_mode: 'append_sparse_days',
      days: daySnapshots,
      target_date_iso: head.date_iso,
      ...(head.day_number != null ? { target_day_number: head.day_number } : {}),
    };
  }

  const targetDateRaw =
    options.preview?.scopeDateIso ??
    options.adjustResult?.target_date_iso ??
    blocks[0]?.date;
  const targetDateIso = normalizeItineraryAdjustDateIso(targetDateRaw);
  if (!targetDateIso) return null;

  const days = resolveItineraryAdjustScheduleDays({
    timelineDayBlocks: blocks,
    targetDateIso,
  });
  const day = days.find((d) => (d.items?.length ?? 0) > 0) ?? days[0];
  const items = day?.items ?? [];
  if (!items.length) return null;

  const targetDayNumber =
    options.preview?.targetDayNumber ?? options.adjustResult?.target_day_number;

  return {
    apply_mode: 'replace_day',
    target_date_iso: targetDateIso,
    ...(targetDayNumber != null ? { target_day_number: targetDayNumber } : {}),
    items,
  };
}

/** 与后端 buildPendingItineraryAdjustDraft 对齐：POI_SLOT_FILL 多稀疏日写入 TripRun 缓存前的快照 */
export function buildPendingItineraryAdjustDraft(
  options: Parameters<typeof buildItineraryAdjustDraftSnapshot>[0]
): ItineraryAdjustDraftSnapshot | null {
  return buildItineraryAdjustDraftSnapshot(options);
}

export function focusPlanStudioItineraryAdjustTargetDay(
  selectDay: ((dayIndex: number, date: string) => void) | undefined,
  snapshot: Pick<ItineraryAdjustDraftSnapshot, 'target_date_iso' | 'target_day_number'>
): void {
  if (!selectDay || !snapshot.target_date_iso) return;
  selectDay(snapshot.target_day_number ?? 1, snapshot.target_date_iso);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('plan-studio:select-schedule-day', {
        detail: {
          dateIso: snapshot.target_date_iso,
          dayNumber: snapshot.target_day_number,
        },
      })
    );
  }
}
