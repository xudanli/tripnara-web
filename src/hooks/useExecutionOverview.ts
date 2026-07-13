import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobileExecutionApi } from '@/api/mobile-execution';
import type { MobileExecutionOverviewDto } from '@/types/mobile-execution';

export const executionOverviewKeys = {
  all: ['execution-overview'] as const,
  trip: (tripId: string) => [...executionOverviewKeys.all, tripId] as const,
  lite: (tripId: string) => [...executionOverviewKeys.trip(tripId), 'lite'] as const,
  full: (tripId: string) => [...executionOverviewKeys.trip(tripId), 'full'] as const,
};

export interface UseExecutionOverviewOptions {
  enabled?: boolean;
  dayIndex?: number;
}

export interface UseExecutionOverviewResult {
  overview: MobileExecutionOverviewDto | null;
  loading: boolean;
  partial: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useExecutionOverview(
  tripId: string | null | undefined,
  options?: UseExecutionOverviewOptions,
): UseExecutionOverviewResult {
  const enabled = Boolean(tripId) && options?.enabled !== false;
  const queryClient = useQueryClient();

  const liteQuery = useQuery({
    queryKey: executionOverviewKeys.lite(tripId ?? ''),
    queryFn: () => mobileExecutionApi.getExecutionOverview(tripId!, { lite: true, dayIndex: options?.dayIndex }),
    enabled,
    staleTime: 15_000,
  });

  const fullQuery = useQuery({
    queryKey: executionOverviewKeys.full(tripId ?? ''),
    queryFn: () => mobileExecutionApi.getExecutionOverview(tripId!, { dayIndex: options?.dayIndex }),
    enabled: enabled && liteQuery.isSuccess,
    staleTime: 15_000,
  });

  const overview = fullQuery.data ?? liteQuery.data ?? null;
  const partial = Boolean(overview?.meta?.partial || (liteQuery.isSuccess && fullQuery.isFetching));

  const reload = async () => {
    if (!tripId || !enabled) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: executionOverviewKeys.lite(tripId) }),
      queryClient.invalidateQueries({ queryKey: executionOverviewKeys.full(tripId) }),
    ]);
  };

  const error =
    fullQuery.error instanceof Error
      ? fullQuery.error.message
      : liteQuery.error instanceof Error
        ? liteQuery.error.message
        : null;

  return {
    overview,
    loading: liteQuery.isLoading,
    partial,
    error,
    reload,
  };
}
