import { useQuery } from '@tanstack/react-query';
import { arrangeItineraryApi } from '@/api/arrange-itinerary';
import type { ArrangeOrchestrationPhase } from '@/types/arrange-itinerary';

const IN_PROGRESS_PHASES = new Set<ArrangeOrchestrationPhase>([
  'ANALYZING',
  'GENERATING',
  'VALIDATING',
  'APPLYING',
]);

const SNAPSHOT_IDLE_POLL_MS = 60_000;

export const planningWorkbenchSnapshotKeys = {
  all: ['planning-workbench-snapshot'] as const,
  trip: (tripId: string) => [...planningWorkbenchSnapshotKeys.all, tripId] as const,
};

function snapshotHasActiveOrchestration(
  data: Awaited<ReturnType<typeof arrangeItineraryApi.getPlanningWorkbenchSnapshot>> | undefined,
): boolean {
  if (!data) return false;
  const phase = data.orchestrationState?.phase;
  if (phase && IN_PROGRESS_PHASES.has(phase)) return true;
  if ((data.pendingProposalCount ?? 0) > 0) return true;
  return Boolean(data.orchestrationState?.activeProposalId?.trim());
}

/** 编排工作台快照 — 无 active proposal 时不轮询 */
export function usePlanningWorkbenchSnapshot(tripId: string, enabled = true) {
  return useQuery({
    queryKey: planningWorkbenchSnapshotKeys.trip(tripId),
    queryFn: () => arrangeItineraryApi.getPlanningWorkbenchSnapshot(tripId),
    enabled: Boolean(tripId) && enabled,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const phase = data?.orchestrationState?.phase;
      if (phase && IN_PROGRESS_PHASES.has(phase)) return 2_000;
      if (!snapshotHasActiveOrchestration(data)) return false;
      return SNAPSHOT_IDLE_POLL_MS;
    },
  });
}
