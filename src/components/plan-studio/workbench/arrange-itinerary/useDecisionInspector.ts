import { useQuery } from '@tanstack/react-query';
import { fetchDecisionInspector } from '@/dto/frontend-arrange-itinerary-api-client';
import type { PlanningDecisionInspectorFetchParams } from '@/dto/frontend-planning-decision-inspector.types';

export const decisionInspectorKeys = {
  all: ['decision-inspector'] as const,
  trip: (
    tripId: string,
    params: {
      proposalId?: string | null;
      problemId?: string | null;
      optionId?: string | null;
      conflictId?: string | null;
    },
  ) =>
    [
      ...decisionInspectorKeys.all,
      tripId,
      params.proposalId ?? '',
      params.problemId ?? '',
      params.optionId ?? '',
      params.conflictId ?? '',
    ] as const,
};

export function useDecisionInspector(
  tripId: string,
  params: {
    proposalId?: string | null;
    problemId?: string | null;
    optionId?: string | null;
    conflictId?: string | null;
  },
  enabled = true,
) {
  const proposalId = params.proposalId?.trim() || undefined;
  const problemId = params.problemId?.trim() || undefined;
  const canFetch = Boolean(tripId && enabled && (proposalId || problemId));

  return useQuery({
    queryKey: decisionInspectorKeys.trip(tripId, params),
    queryFn: () =>
      fetchDecisionInspector(tripId, {
        proposalId,
        problemId,
        optionId: params.optionId ?? undefined,
        conflictId: params.conflictId ?? undefined,
      }),
    enabled: canFetch,
    staleTime: 30_000,
    retry: false,
  });
}

export type { PlanningDecisionInspectorFetchParams };
