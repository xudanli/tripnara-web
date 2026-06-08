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

/** 与后端 DTO 对齐：目标日草案条目快照 */
export interface ItineraryAdjustDraftSnapshot {
  target_date_iso: string;
  target_day_number?: number;
  items: unknown[];
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
}): ItineraryAdjustDraftSnapshot | null {
  const targetDateRaw =
    options.preview?.scopeDateIso ??
    options.adjustResult?.target_date_iso ??
    options.timelineDayBlocks?.[0]?.date;
  const targetDateIso = normalizeItineraryAdjustDateIso(targetDateRaw);
  if (!targetDateIso) return null;

  const blocks =
    options.preview?.timelineDayBlocks ??
    options.timelineDayBlocks;
  if (!blocks?.length) return null;

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
    target_date_iso: targetDateIso,
    ...(targetDayNumber != null ? { target_day_number: targetDayNumber } : {}),
    items,
  };
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
