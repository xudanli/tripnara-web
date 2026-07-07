import { useQuery } from '@tanstack/react-query';
import {
  fetchTripDecisionFollowUpTasks,
  tripDecisionFollowUpTasksQueryKey,
} from '@/lib/trip-decision-follow-up-tasks.util';

export function useTripDecisionFollowUpTasks(
  tripId: string | undefined,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: tripId ? tripDecisionFollowUpTasksQueryKey(tripId) : ['decision-follow-up-tasks', 'disabled'],
    queryFn: () => fetchTripDecisionFollowUpTasks(tripId!),
    enabled: Boolean(tripId) && (opts?.enabled ?? true),
    staleTime: 10_000,
  });
}
