import { useQuery } from '@tanstack/react-query';
import { collaborativeTasksApi } from '@/api/collaborative-tasks';
import { tripDomainInfluenceApi } from '@/api/trip-domain-influence';
import { reconcileNegotiationTasksWithDomainClaims } from '@/lib/reconcile-negotiation-tasks-with-claims';

export function useDomainNegotiationTasks(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trips', tripId, 'collaborative-tasks', 'negotiation'],
    queryFn: async () => {
      const res = await collaborativeTasksApi.list(tripId!);
      let snapshot = null;
      try {
        snapshot = await tripDomainInfluenceApi.getSnapshot(tripId!);
      } catch {
        snapshot = null;
      }
      return reconcileNegotiationTasksWithDomainClaims(res.negotiationTasks, snapshot);
    },
    enabled: Boolean(tripId),
    staleTime: 15_000,
  });
}
