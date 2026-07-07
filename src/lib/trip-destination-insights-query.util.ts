import type { TripDestinationInsightsQuery } from '@/types/trip-destination-insights';

export interface ResolveTripDestinationInsightsQueryInput {
  problemId?: string | null;
  focusConflictId?: string | null;
  poiSlug?: string | null;
  placeId?: string | null;
  dayIndex?: number | null;
  includeRag?: boolean;
}

/** 至少需一个 scope 参数，否则返回 null（避免无过滤的全量请求） */
export function resolveTripDestinationInsightsQuery(
  input: ResolveTripDestinationInsightsQueryInput,
): TripDestinationInsightsQuery | null {
  const query: TripDestinationInsightsQuery = {};

  const problemId = input.problemId?.trim();
  if (problemId) query.problemId = problemId;

  const focusConflictId = input.focusConflictId?.trim();
  if (focusConflictId) query.focusConflictId = focusConflictId;

  const poiSlug = input.poiSlug?.trim();
  if (poiSlug) query.poiSlug = poiSlug;

  const placeId = input.placeId?.trim();
  if (placeId) query.placeId = placeId;

  if (input.dayIndex != null && input.dayIndex >= 0) {
    query.dayIndex = input.dayIndex;
  }

  if (input.includeRag) {
    query.includeRag = true;
  }

  if (
    !query.problemId &&
    !query.focusConflictId &&
    !query.poiSlug &&
    !query.placeId &&
    query.dayIndex === undefined
  ) {
    return null;
  }

  return query;
}

export function tripDestinationInsightsQueryKey(
  tripId: string,
  query: TripDestinationInsightsQuery | null,
): readonly unknown[] {
  return [
    'trips',
    tripId,
    'destination-insights',
    query?.problemId ?? '',
    query?.focusConflictId ?? '',
    query?.poiSlug ?? '',
    query?.placeId ?? '',
    query?.dayIndex ?? '',
    query?.includeRag ? 'rag' : '',
  ];
}
