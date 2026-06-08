import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activeTripApi } from '@/api/active-trip';
import { activeTripSubResourceApi } from '@/api/active-trip-subresources';
import type { TripDecisionEventRequest } from '@/types/active-trip-dashboard';

export const activeTripQueryKey = (tripId: string) => ['trips', tripId, 'active'] as const;

export const decisionReplayQueryKey = (tripId: string) =>
  ['trips', tripId, 'decision-replay'] as const;

export const templateBackflowQueryKey = (tripId: string) =>
  ['trips', tripId, 'template-backflow'] as const;

export function useActiveTripDashboard(tripId: string | undefined) {
  return useQuery({
    queryKey: activeTripQueryKey(tripId ?? ''),
    queryFn: () => activeTripApi.getDashboard(tripId!),
    enabled: Boolean(tripId),
    staleTime: 8_000,
  });
}

export function useDecisionReplay(tripId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: decisionReplayQueryKey(tripId ?? ''),
    queryFn: () => activeTripSubResourceApi.getDecisionReplay(tripId!),
    enabled: Boolean(tripId) && enabled,
    staleTime: 30_000,
  });
}

export function useTemplateBackflowPreview(tripId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: templateBackflowQueryKey(tripId ?? ''),
    queryFn: () => activeTripSubResourceApi.getTemplateBackflowPreview(tripId!),
    enabled: Boolean(tripId) && enabled,
    staleTime: 60_000,
  });
}

export function useActiveTripDecisionEvent(tripId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TripDecisionEventRequest) => activeTripApi.postDecisionEvent(tripId!, body),
    onSuccess: (data) => {
      if (tripId) {
        qc.setQueryData(activeTripQueryKey(tripId), data);
        qc.invalidateQueries({ queryKey: decisionReplayQueryKey(tripId) });
      }
    },
  });
}

export function useInvalidateActiveTripDashboard() {
  const qc = useQueryClient();
  return (tripId: string) => {
    qc.invalidateQueries({ queryKey: activeTripQueryKey(tripId) });
  };
}
