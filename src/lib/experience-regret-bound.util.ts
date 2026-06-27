import { getTripReadinessPhaseFromTrip } from '@/lib/trip-readiness-phase.util';
import { hasExperienceIntentMetadata } from '@/lib/trip-experience-metadata.util';
import type { ExperienceRegretBoundMetadata } from '@/types/experience-regret-bound';
import type { TripDetail } from '@/types/trip';

function isRegretBoundMetadata(value: unknown): value is ExperienceRegretBoundMetadata {
  return (
    value != null &&
    typeof value === 'object' &&
    (value as ExperienceRegretBoundMetadata).revision === 'v1'
  );
}

export function extractExperienceRegretBound(
  metadata?: Record<string, unknown> | null,
): ExperienceRegretBoundMetadata | undefined {
  if (!metadata) return undefined;
  const raw = metadata.experienceRegretBound;
  return isRegretBoundMetadata(raw) ? raw : undefined;
}

export function isExperienceRegretBoundConfirmed(
  bound?: ExperienceRegretBoundMetadata | null,
): boolean {
  return bound?.confirmedUpperBound != null && Number.isFinite(bound.confirmedUpperBound);
}

/** 是否应在 pre_departure 强制确认体验底线（评审 3a + legacy 豁免） */
export function shouldRequireExperienceRegretConfirmation(trip: TripDetail | null | undefined): boolean {
  if (!trip) return false;
  if (!hasExperienceIntentMetadata(trip.metadata)) return false;
  if (isExperienceRegretBoundConfirmed(extractExperienceRegretBound(trip.metadata))) return false;
  const phase = getTripReadinessPhaseFromTrip(trip);
  return phase === 'pre_departure';
}

export function isExperienceRegretNotApplicableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { response?: { status?: number }; code?: string; message?: string };
  if (err.response?.status === 404) return true;
  if (err.code === 'NOT_FOUND' || err.code === 'ENDPOINT_NOT_FOUND') return true;
  const message = String(err.message ?? '');
  return /not found|不存在|无 experienceUnderstanding|legacy/i.test(message);
}

export function resolveDraftUpperBound(
  trip: TripDetail | null | undefined,
  dualTrackRegret?: number | null,
): number | undefined {
  const fromMeta = extractExperienceRegretBound(trip?.metadata)?.draftUpperBound;
  if (fromMeta != null && Number.isFinite(fromMeta)) return fromMeta;
  if (dualTrackRegret != null && Number.isFinite(dualTrackRegret)) return dualTrackRegret;
  return undefined;
}
