import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { getPlanProposal } from '@/dto/frontend-arrange-itinerary-api-client';

export const planProposalKeys = {
  all: ['plan-proposal'] as const,
  trip: (tripId: string, proposalId: string) =>
    [...planProposalKeys.all, tripId, proposalId] as const,
};

const PLAN_PROPOSAL_STALE_MS = 30_000;

/** 加载编排草案 — 方案卡 SSOT 为 proposal.decisionPack.options[] */
export function usePlanProposal(tripId: string, proposalId?: string | null, enabled = true) {
  const id = proposalId?.trim() ?? '';
  return useQuery({
    queryKey: planProposalKeys.trip(tripId, id),
    queryFn: () => getPlanProposal(tripId, id),
    enabled: Boolean(tripId && id && enabled),
    staleTime: PLAN_PROPOSAL_STALE_MS,
    retry: false,
  });
}

/** 决策空间打开前预取 proposal.decisionPack */
export function prefetchPlanProposal(
  queryClient: QueryClient,
  tripId: string,
  proposalId: string,
): Promise<void> {
  const id = proposalId.trim();
  if (!tripId || !id) return Promise.resolve();
  return queryClient
    .prefetchQuery({
      queryKey: planProposalKeys.trip(tripId, id),
      queryFn: () => getPlanProposal(tripId, id),
      staleTime: PLAN_PROPOSAL_STALE_MS,
    })
    .then(() => undefined);
}
