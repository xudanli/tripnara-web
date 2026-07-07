import { useQuery } from '@tanstack/react-query';
import {
  getDestinationInsights,
  type TripDestinationInsightsQuery,
  type TripDestinationInsightsResponse,
} from '@/api/trip-destination-insights';
import {
  resolveTripDestinationInsightsQuery,
  tripDestinationInsightsQueryKey,
  type ResolveTripDestinationInsightsQueryInput,
} from '@/lib/trip-destination-insights-query.util';

export interface UseTripDestinationInsightsOptions extends ResolveTripDestinationInsightsQueryInput {
  enabled?: boolean;
}

const responseCache = new Map<string, TripDestinationInsightsResponse>();
const etagCache = new Map<string, string>();

function cacheKey(tripId: string, query: TripDestinationInsightsQuery): string {
  return JSON.stringify(tripDestinationInsightsQueryKey(tripId, query));
}

async function fetchDestinationInsights(
  tripId: string,
  query: TripDestinationInsightsQuery,
): Promise<TripDestinationInsightsResponse> {
  const key = cacheKey(tripId, query);
  const ifNoneMatch = etagCache.get(key);

  const result = await getDestinationInsights(tripId, { ...query, ifNoneMatch });

  if (result.status === 'not_modified') {
    const cached = responseCache.get(key);
    if (cached) return cached;
    const retry = await getDestinationInsights(tripId, query);
    if (retry.status !== 'ok') {
      throw new Error('目的地洞察缓存失效，请刷新重试');
    }
    responseCache.set(key, retry.data);
    if (retry.etag) etagCache.set(key, retry.etag);
    return retry.data;
  }

  responseCache.set(key, result.data);
  if (result.etag) etagCache.set(key, result.etag);
  return result.data;
}

export function useTripDestinationInsights(
  tripId: string | undefined,
  options: UseTripDestinationInsightsOptions = {},
) {
  const { enabled = true, ...scope } = options;

  const query = resolveTripDestinationInsightsQuery(scope);
  const canFetch = Boolean(tripId && query && enabled);

  return useQuery({
    queryKey: tripDestinationInsightsQueryKey(tripId ?? '', query),
    queryFn: () => fetchDestinationInsights(tripId!, query as TripDestinationInsightsQuery),
    enabled: canFetch,
    staleTime: 60_000,
  });
}
