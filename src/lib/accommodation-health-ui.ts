import type { RouteAndRunResponse } from '@/api/agent';
import {
  isAccommodationHealthPayload,
  type AccommodationHealthNight,
  type AccommodationHealthPayload,
  type AccommodationNightStatus,
} from '@/types/accommodation-health';
import { getEmotionContextStoreState } from '@/store/emotionContextStore';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function normalizeNightStatus(v: unknown): AccommodationNightStatus {
  if (v === 'booked' || v === 'missing' || v === 'warning' || v === 'critical') return v;
  return 'missing';
}

export function normalizeAccommodationHealthNight(
  v: unknown,
  index: number
): AccommodationHealthNight | null {
  if (!isRecord(v)) return null;

  const night_index =
    pickNum(v.night_index) ?? pickNum(v.nightIndex) ?? index + 1;

  return {
    night_index,
    status: normalizeNightStatus(v.status),
    ...(pickStr(v.date_label_zh) ?? pickStr(v.dateLabelZh)
      ? { date_label_zh: pickStr(v.date_label_zh) ?? pickStr(v.dateLabelZh) }
      : {}),
    ...(pickStr(v.label_zh) ?? pickStr(v.labelZh)
      ? { label_zh: pickStr(v.label_zh) ?? pickStr(v.labelZh) }
      : {}),
    ...(pickStr(v.warning_badge_zh) ?? pickStr(v.warningBadgeZh)
      ? { warning_badge_zh: pickStr(v.warning_badge_zh) ?? pickStr(v.warningBadgeZh) }
      : {}),
    ...(pickStr(v.driving_time_label_zh) ?? pickStr(v.drivingTimeLabelZh)
      ? {
          driving_time_label_zh:
            pickStr(v.driving_time_label_zh) ?? pickStr(v.drivingTimeLabelZh),
        }
      : {}),
    ...(pickStr(v.cta_label_zh) ?? pickStr(v.ctaLabelZh)
      ? { cta_label_zh: pickStr(v.cta_label_zh) ?? pickStr(v.ctaLabelZh) }
      : {}),
  };
}

export function normalizeAccommodationHealth(raw: unknown): AccommodationHealthPayload | null {
  if (!isAccommodationHealthPayload(raw)) return null;

  const nights = raw.nights
    .map((n, idx) => normalizeAccommodationHealthNight(n, idx))
    .filter(Boolean) as AccommodationHealthNight[];

  if (!nights.length) return null;

  return {
    schema: 'tripnara.accommodation_health@v1',
    nights,
    ...(pickStr(raw.summary_zh) ?? pickStr(raw.summaryZh)
      ? { summary_zh: pickStr(raw.summary_zh) ?? pickStr(raw.summaryZh) }
      : {}),
  };
}

function pickRawAccommodationHealth(payload: Record<string, unknown> | undefined): unknown {
  if (!payload) return undefined;

  const uiDisplay = isRecord(payload.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.accommodation_health ?? uiDisplay?.accommodationHealth;
  if (fromUi != null) return fromUi;

  const narration = isRecord(payload.narration) ? payload.narration : undefined;
  return narration?.accommodation_health ?? narration?.accommodationHealth;
}

export function pickAccommodationHealthFromRouteRun(
  response: RouteAndRunResponse
): AccommodationHealthPayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  return normalizeAccommodationHealth(pickRawAccommodationHealth(payload));
}

export function hasAccommodationHealthUi(
  health: AccommodationHealthPayload | null | undefined
): boolean {
  return Boolean(health?.nights?.length);
}

export function applyAccommodationHealthSideEffects(
  health: AccommodationHealthPayload | null
): void {
  getEmotionContextStoreState().setAccommodationHealth(health);
}
