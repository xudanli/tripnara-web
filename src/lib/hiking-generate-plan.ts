/**
 * 徒步行程 — 决策引擎 generate-plan 请求构建（Phase 2.5）
 */

import type { GeneratePlanRequest } from '@/types/decision-engine';
import type { TripDetail } from '@/types/trip';
import type { FitnessProfile } from '@/types/fitness';
import { resolveLongestHike } from '@/lib/longest-hike-resolve';
import {
  buildHikingAuditMetadata,
  buildTrailPlanPreviewBody,
  getTripHikingSegments,
  inferRouteDirectionName,
  isEmbeddedHikingTrip,
} from '@/lib/trip-hiking';
import {
  buildEmbeddedHikingSignals,
  dayOverlapsAnySegment,
  segmentDateRange,
  segmentSpanDays,
} from '@/lib/hiking-segments';

function parseCountry(destination?: string): string {
  if (!destination) return '';
  const part = destination.split(',')[0]?.trim().toUpperCase() ?? '';
  return part.length === 2 ? part : destination.trim().toUpperCase();
}

/** 从行程日构建 candidatesByDate（有行程项则带上 placeId） */
export function buildCandidatesByDate(
  trip: TripDetail
): Record<string, Array<Record<string, unknown>>> {
  const out: Record<string, Array<Record<string, unknown>>> = {};
  for (const day of trip.TripDay ?? []) {
    const date = day.date?.split('T')[0] ?? day.date;
    if (!date) continue;
    const items = day.ItineraryItem ?? [];
    out[date] =
      items.length > 0
        ? items.map((item) => ({
            placeId: item.placeId,
            id: item.id,
            type: item.type,
          }))
        : [];
  }
  return out;
}

/** embedded：candidatesByDate 仅保留落在徒步片段内的日期 */
export function buildCandidatesByDateForEmbedded(
  trip: TripDetail,
  segments: import('@/types/hiking-embedded').HikingSegment[]
): Record<string, Array<Record<string, unknown>>> {
  const all = buildCandidatesByDate(trip);
  if (segments.length === 0) return all;
  const out: Record<string, Array<Record<string, unknown>>> = {};
  for (const [date, items] of Object.entries(all)) {
    if (dayOverlapsAnySegment(date, segments)) out[date] = items;
  }
  return out;
}

export function buildGeneratePlanRequestForHiking(
  trip: TripDetail,
  options?: { fitnessProfile?: FitnessProfile | null }
): GeneratePlanRequest {
  const md = trip.metadata ?? {};
  const country = parseCountry(trip.destination);
  const routeDirectionName =
    (md.routeDirectionName as string) ??
    inferRouteDirectionName(trip.destination) ??
    'IS_LAUGAVEGUR';

  const embedded = isEmbeddedHikingTrip(trip);
  const segments = getTripHikingSegments(trip);
  const segRange = segmentDateRange(segments);
  const startDate = embedded && segRange
    ? segRange.startDate
    : trip.startDate?.split('T')[0] ?? trip.startDate;
  const durationDays = embedded
    ? segmentSpanDays(segments) || trip.TripDay?.length || 0
    : trip.TripDay?.length ?? 0;
  const embeddedSignals = embedded ? buildEmbeddedHikingSignals(segments) : undefined;

  const hikingMeta = buildHikingAuditMetadata({
    hikingLevel: embedded
      ? 'light'
      : (md.hikingLevel as 'none' | 'light' | 'hiking-heavy' | undefined) ?? 'hiking-heavy',
    destination: trip.destination,
    routeDirectionName,
  });

  const previewHints = buildTrailPlanPreviewBody(trip);

  return {
    tripId: trip.id,
    state: {
      context: {
        destination: country || 'IS',
        startDate,
        durationDays,
        routeDirectionName,
        tags: embedded ? ['徒步', 'embedded'] : ['徒步'],
        hikingProfile: embedded ? 'embedded' : 'primary',
        longestHike: resolveLongestHike({
          profile: options?.fitnessProfile ?? null,
        }),
        preferences: {
          pace: trip.pacingConfig?.level ?? 'moderate',
          maxDailyAscentM: options?.fitnessProfile?.recommendedDailyAscentM,
        },
        ...previewHints,
      },
      candidatesByDate: embedded
        ? buildCandidatesByDateForEmbedded(trip, segments)
        : buildCandidatesByDate(trip),
      ...(embeddedSignals
        ? { signals: { embeddedHiking: embeddedSignals } }
        : {}),
    },
    metadata: {
      ...hikingMeta,
      ...(embedded ? { hikingProfile: 'embedded' as const } : {}),
    },
  };
}

const LOG_STORAGE_PREFIX = 'tripnara_hiking_generate_log_';

export function saveHikingGenerateLog(
  tripId: string,
  log: Record<string, unknown>
): void {
  try {
    sessionStorage.setItem(
      `${LOG_STORAGE_PREFIX}${tripId}`,
      JSON.stringify({ log, savedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

export function loadHikingGenerateLog(
  tripId: string
): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(`${LOG_STORAGE_PREFIX}${tripId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { log?: Record<string, unknown> };
    return parsed.log ?? null;
  } catch {
    return null;
  }
}
