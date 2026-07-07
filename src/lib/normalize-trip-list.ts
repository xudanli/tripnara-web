import type { TripPlanningAvailability } from '@/lib/trip-content-mode';
import type { TripListCardDto, TripListPageResponse } from '@/types/trip-list';
import type { TripStatus } from '@/types/trip';
import { normalizeTripApiFields } from '@/lib/trip-content-mode';

const PLANNING_AVAILABILITY = new Set<TripPlanningAvailability>([
  'ready',
  'draft',
  'collecting_info',
  'initializing',
  'ready_to_generate',
  'generating',
  'failed',
]);

function normalizeTripStatus(status: unknown): TripStatus | undefined {
  if (typeof status !== 'string') return undefined;
  const upper = status.toUpperCase();
  if (upper === 'TRAVELING') return 'IN_PROGRESS';
  if (upper === 'PLANNING' || upper === 'IN_PROGRESS' || upper === 'COMPLETED' || upper === 'CANCELLED') {
    return upper as TripStatus;
  }
  return undefined;
}

function normalizePlanningAvailability(value: unknown): TripPlanningAvailability | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase() as TripPlanningAvailability;
  return PLANNING_AVAILABILITY.has(normalized) ? normalized : undefined;
}

/** 对齐 BFF：poi_itinerary → poi_timeline 等 */
export function normalizeTripListCardDto(raw: TripListCardDto): TripListCardDto {
  const base = normalizeTripApiFields(raw) as TripListCardDto;
  const status = normalizeTripStatus(base.status) ?? base.status;
  const planningAvailability =
    normalizePlanningAvailability(base.planningAvailability) ??
    normalizePlanningAvailability((base.metadata as Record<string, unknown> | undefined)?.planningAvailability);

  return {
    ...base,
    status,
    ...(planningAvailability ? { planningAvailability } : {}),
  };
}

export function normalizeTripListPageResponse(raw: TripListPageResponse): TripListPageResponse {
  const trips = Array.isArray(raw.trips) ? raw.trips.map(normalizeTripListCardDto) : [];
  return {
    trips,
    total: typeof raw.total === 'number' ? raw.total : trips.length,
  };
}
