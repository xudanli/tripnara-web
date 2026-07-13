import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripExecutabilityApi } from '@/api/trip-executability';
import { shouldShowSelfDriveExecutability } from '@/lib/trip-executability.util';
import type { ConstraintsSummaryResponse } from '@/types/planning-constraints';
import type { TripExecutabilityView } from '@/types/trip-executability';

const STALE_MS = 30_000;
const REFRESH_DEBOUNCE_MS = 800;

export const tripExecutabilityKeys = {
  all: ['trip-executability'] as const,
  trip: (tripId: string) => [...tripExecutabilityKeys.all, tripId] as const,
};

export interface UseTripExecutabilityOptions {
  enabled?: boolean;
  destination?: string | null;
  constraintsSummary?: ConstraintsSummaryResponse | null;
}

export interface UseTripExecutabilityResult {
  visible: boolean;
  data: TripExecutabilityView | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refreshAfterPlanEdit: () => void;
}

export function useTripExecutability(
  tripId: string | null | undefined,
  options?: UseTripExecutabilityOptions,
): UseTripExecutabilityResult {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = Boolean(
    options?.enabled !== false &&
      tripId &&
      shouldShowSelfDriveExecutability(options?.destination, options?.constraintsSummary),
  );

  const query = useQuery({
    queryKey: tripExecutabilityKeys.trip(tripId ?? ''),
    queryFn: () => tripExecutabilityApi.getExecutability(tripId!),
    enabled: visible,
    staleTime: STALE_MS,
  });

  const refreshMutation = useMutation({
    mutationFn: () => tripExecutabilityApi.refreshAfterPlanEdit(tripId!),
    onSuccess: (data) => {
      if (tripId) {
        queryClient.setQueryData(tripExecutabilityKeys.trip(tripId), data);
      }
    },
  });

  const reload = useCallback(async () => {
    if (!tripId || !visible) return;
    await queryClient.fetchQuery({
      queryKey: tripExecutabilityKeys.trip(tripId),
      queryFn: () => tripExecutabilityApi.getExecutability(tripId, { refresh: true }),
    });
  }, [queryClient, tripId, visible]);

  const refreshAfterPlanEdit = useCallback(() => {
    if (!tripId || !visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refreshMutation.mutate();
    }, REFRESH_DEBOUNCE_MS);
  }, [refreshMutation, tripId, visible]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!tripId || !visible) return;

    const handler = () => refreshAfterPlanEdit();
    window.addEventListener('plan-studio:schedule-refresh', handler);
    return () => window.removeEventListener('plan-studio:schedule-refresh', handler);
  }, [refreshAfterPlanEdit, tripId, visible]);

  return {
    visible,
    data: query.data ?? null,
    loading: query.isLoading,
    refreshing: refreshMutation.isPending || (query.isFetching && !query.isLoading),
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? String(query.error)
          : refreshMutation.error instanceof Error
            ? refreshMutation.error.message
            : null,
    reload,
    refreshAfterPlanEdit,
  };
}
