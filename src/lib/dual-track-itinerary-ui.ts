import type { RouteAndRunResponse } from '@/api/agent';
import type { DualTrackItineraryPayload } from '@/types/dual-track-itinerary';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function isDualTrackItineraryPayload(v: unknown): v is DualTrackItineraryPayload {
  if (!isRecord(v)) return false;
  if (v.schema !== 'tripnara.dual_track_itinerary@v1') return false;
  if (v.mode !== 'dual_track' && v.mode !== 'single_track') return false;
  if (!Array.isArray(v.axis_a_segments) || !Array.isArray(v.axis_b_branches)) return false;
  return true;
}

/** 展示层：result.payload.ui_display.dual_track_itinerary */
export function pickDualTrackItineraryFromRouteRun(
  response: RouteAndRunResponse
): DualTrackItineraryPayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const uiDisplay = isRecord(payload?.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.dual_track_itinerary;
  if (isDualTrackItineraryPayload(fromUi)) return fromUi;

  return null;
}

export function hasDualTrackItineraryUi(payload: DualTrackItineraryPayload | null | undefined): boolean {
  if (!payload) return false;
  if (payload.mode === 'dual_track') {
    return payload.axis_a_segments.length > 0 || payload.axis_b_branches.length > 0;
  }
  return payload.axis_a_segments.length > 0;
}

export function formatUtilityRatio(ratio: number | undefined | null): string {
  if (ratio == null || Number.isNaN(ratio)) return '—';
  return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}
