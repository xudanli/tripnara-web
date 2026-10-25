import { useQuery } from '@tanstack/react-query';
import { fetchDecisionBasis } from '@/dto/frontend-arrange-itinerary-api-client';

export const decisionBasisKeys = {
  all: ['decision-basis'] as const,
  trip: (
    tripId: string,
    conflictId?: string | null,
    proposalId?: string | null,
    problemId?: string | null,
  ) =>
    [
      ...decisionBasisKeys.all,
      tripId,
      conflictId ?? '',
      proposalId ?? '',
      problemId ?? '',
    ] as const,
};

export interface UseDecisionBasisParams {
  conflictId?: string | null;
  proposalId?: string | null;
  problemId?: string | null;
}

async function loadDecisionBasis(
  tripId: string,
  params: { conflictId?: string; proposalId?: string; problemId?: string },
) {
  try {
    return await fetchDecisionBasis(tripId, params);
  } catch (error) {
    // conflictId 不匹配时，仅在仍有 problemId / proposalId 时重试；禁止裸拉「首个缓冲冲突」
    if (params.conflictId && (params.problemId || params.proposalId)) {
      return fetchDecisionBasis(tripId, {
        proposalId: params.proposalId,
        problemId: params.problemId,
      });
    }
    throw error;
  }
}

export function useDecisionBasis(
  tripId: string,
  params: UseDecisionBasisParams = {},
  enabled = true,
) {
  const { conflictId, proposalId, problemId } = params;
  const scoped = Boolean(conflictId || proposalId || problemId);
  return useQuery({
    queryKey: decisionBasisKeys.trip(tripId, conflictId, proposalId, problemId),
    queryFn: () =>
      loadDecisionBasis(tripId, {
        conflictId: conflictId ?? undefined,
        proposalId: proposalId ?? undefined,
        problemId: problemId ?? undefined,
      }),
    enabled: Boolean(tripId) && enabled && scoped,
    staleTime: 30_000,
    retry: false,
  });
}
