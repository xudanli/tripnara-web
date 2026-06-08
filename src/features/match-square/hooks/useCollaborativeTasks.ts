import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collaborativeTasksApi } from '@/api/collaborative-tasks';
import type { CollaborativeTaskEventRequest } from '@/types/collaborative-task-flywheel';
import { extractFlywheelFromTripMetadata } from '../lib/decision-engine';
import type { TripDetail } from '@/types/trip';

export function useCollaborativeTasks(
  tripId: string | undefined,
  opts?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['trips', tripId, 'collaborative-tasks'],
    queryFn: () => collaborativeTasksApi.list(tripId!),
    enabled: Boolean(tripId) && (opts?.enabled ?? true),
    staleTime: 10_000,
  });
}

export function useCollaborativeTaskEvent(tripId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      body,
    }: {
      taskId: string;
      body: CollaborativeTaskEventRequest;
    }) => collaborativeTasksApi.postEvent(tripId!, taskId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips', tripId, 'collaborative-tasks'] });
      qc.invalidateQueries({ queryKey: ['trips', tripId, 'active'] });
    },
  });
}

export function useTripCollaborativeFlywheelFromMetadata(trip: TripDetail | null | undefined) {
  if (!trip?.metadata) return null;
  return extractFlywheelFromTripMetadata(trip.metadata as Record<string, unknown>);
}
