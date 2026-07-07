import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDecisionCausalChain } from '@/dto/frontend-arrange-itinerary-api-client';

export const decisionCausalChainKeys = {
  all: ['decision-causal-chain'] as const,
  trip: (
    tripId: string,
    params?: {
      proposalId?: string | null;
      problemId?: string | null;
      optionId?: string | null;
    },
  ) =>
    [
      ...decisionCausalChainKeys.all,
      tripId,
      params?.proposalId ?? '',
      params?.problemId ?? '',
      params?.optionId ?? '',
    ] as const,
};

export function useDecisionCausalChain(
  tripId: string,
  params?: {
    proposalId?: string | null;
    problemId?: string | null;
    optionId?: string | null;
  },
  enabled = true,
) {
  const proposalId = params?.proposalId?.trim() || undefined;
  const problemId = params?.problemId?.trim() || undefined;
  const optionId = params?.optionId?.trim() || undefined;
  return useQuery({
    queryKey: decisionCausalChainKeys.trip(tripId, { proposalId, problemId, optionId }),
    queryFn: () => fetchDecisionCausalChain(tripId, { proposalId, problemId, optionId }),
    enabled: Boolean(tripId) && enabled && Boolean(proposalId || problemId),
    staleTime: 30_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}
