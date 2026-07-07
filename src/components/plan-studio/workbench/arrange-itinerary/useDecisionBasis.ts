import { useQuery } from '@tanstack/react-query';
import { fetchDecisionBasis } from '@/dto/frontend-arrange-itinerary-api-client';

export const decisionBasisKeys = {
  all: ['decision-basis'] as const,
  trip: (
    tripId: string,
    conflictId?: string | null,
    proposalId?: string | null,
  ) => [...decisionBasisKeys.all, tripId, conflictId ?? '', proposalId ?? ''] as const,
};

export interface UseDecisionBasisParams {
  conflictId?: string | null;
  proposalId?: string | null;
}

async function loadDecisionBasis(
  tripId: string,
  params: { conflictId?: string; proposalId?: string },
) {
  try {
    return await fetchDecisionBasis(tripId, params);
  } catch (error) {
    // conflictId 与 BFF 不一致时，回退无 conflictId（服务端自动选首个交通/缓冲冲突）
    if (params.conflictId) {
      return fetchDecisionBasis(tripId, { proposalId: params.proposalId });
    }
    throw error;
  }
}

export function useDecisionBasis(
  tripId: string,
  params: UseDecisionBasisParams = {},
  enabled = true,
) {
  const { conflictId, proposalId } = params;
  return useQuery({
    queryKey: decisionBasisKeys.trip(tripId, conflictId, proposalId),
    queryFn: () =>
      loadDecisionBasis(tripId, {
        conflictId: conflictId ?? undefined,
        proposalId: proposalId ?? undefined,
      }),
    enabled: Boolean(tripId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}
