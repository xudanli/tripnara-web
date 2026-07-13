import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripResponsibilityApi } from '@/api/trip-responsibility';
import type { TripResponsibilityOwners } from '@/types/trip-responsibility';

export const TRIP_RESPONSIBILITY_QUERY_KEY = (tripId: string) =>
  ['trip', tripId, 'responsibility-owners'] as const;

export function useTripResponsibilityOwners(tripId: string | undefined) {
  return useQuery({
    queryKey: TRIP_RESPONSIBILITY_QUERY_KEY(tripId ?? ''),
    queryFn: async () => {
      if (!tripId) return null;
      const res = await tripResponsibilityApi.get(tripId);
      return res?.owners ?? null;
    },
    enabled: Boolean(tripId),
    staleTime: 30_000,
  });
}

export function useSaveTripResponsibilityOwners(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (owners: TripResponsibilityOwners) =>
      tripResponsibilityApi.patch(tripId, { owners }),
    onSuccess: (data) => {
      queryClient.setQueryData(TRIP_RESPONSIBILITY_QUERY_KEY(tripId), data.owners);
    },
  });
}

export function useSeedTripResponsibilityOwners(tripId: string) {
  const queryClient = useQueryClient();
  return (owners: TripResponsibilityOwners) => {
    tripResponsibilityApi.seedLocal(tripId, owners);
    queryClient.setQueryData(TRIP_RESPONSIBILITY_QUERY_KEY(tripId), owners);
  };
}
