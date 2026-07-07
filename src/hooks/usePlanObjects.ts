import { useQuery } from '@tanstack/react-query';
import { tripTimelineApi } from '@/api/trip-detail-tab-client';
import { planObjectsApi, PlanObjectsApiError } from '@/api/plan-objects';
import {
  countPlanObjectChainObjects,
  normalizePlanObjectsDays,
  parsePlanObjectsResponsePayload,
} from '@/lib/plan-object-source.util';
import type { PlanObjectsQuery, PlanObjectsResponse } from '@/types/plan-objects';

export type PlanObjectsDataSource = 'plan-objects' | 'timeline-overview';

export interface UsePlanObjectsOptions {
  enabled?: boolean;
  query?: PlanObjectsQuery;
  /** plan-objects 空链时回退 timeline-overview?include=planobjects */
  timelineFallback?: boolean;
}

export interface UsePlanObjectsResult {
  data: PlanObjectsResponse | null;
  dataSource: PlanObjectsDataSource | null;
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  refetch: () => void;
}

async function loadPlanObjectsWithFallback(
  tripId: string,
  query?: PlanObjectsQuery,
  timelineFallback = true,
): Promise<{ data: PlanObjectsResponse; dataSource: PlanObjectsDataSource }> {
  const raw = await planObjectsApi.get(tripId, query);
  let parsed = parsePlanObjectsResponsePayload(raw);
  let dataSource: PlanObjectsDataSource = 'plan-objects';

  if (timelineFallback && countPlanObjectChainObjects(parsed.days) === 0) {
    try {
      const overview = await tripTimelineApi.getPhase2Overview(tripId);
      const fallbackDays = normalizePlanObjectsDays(overview.planObjects?.days);
      if (countPlanObjectChainObjects(fallbackDays) > 0) {
        parsed = {
          ...parsed,
          tripId: parsed.tripId || tripId,
          days: fallbackDays,
        };
        dataSource = 'timeline-overview';
      }
    } catch {
      // timeline fallback 可选，失败仍用 plan-objects 空链
    }
  }

  return { data: parsed, dataSource };
}

export function usePlanObjects(
  tripId: string | null | undefined,
  options: UsePlanObjectsOptions = {},
): UsePlanObjectsResult {
  const enabled = options.enabled !== false && Boolean(tripId);
  const timelineFallback = options.timelineFallback !== false;

  const query = useQuery({
    queryKey: ['trips', tripId, 'plan-objects', options.query?.dayNumber ?? 'all', timelineFallback],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => loadPlanObjectsWithFallback(tripId!, options.query, timelineFallback),
  });

  const unavailable =
    query.error instanceof PlanObjectsApiError && query.error.code === 'NOT_FOUND';

  return {
    data: query.data?.data ?? null,
    dataSource: query.data?.dataSource ?? null,
    loading: query.isLoading || query.isFetching,
    error:
      query.error && !unavailable
        ? query.error instanceof Error
          ? query.error.message
          : '加载 plan-objects 失败'
        : null,
    unavailable,
    refetch: () => {
      void query.refetch();
    },
  };
}
