import { useQuery } from '@tanstack/react-query';
import { decisionProblemNegotiationsApi } from '@/api/decision-problem-negotiations';

export function useDecisionProblemNegotiationPreflight(
  tripId: string | undefined,
  problemId: string | null | undefined,
  focusConflictId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'trips',
      tripId,
      'decision-problems',
      problemId,
      'negotiations',
      'preflight',
      focusConflictId ?? '',
    ],
    queryFn: () =>
      decisionProblemNegotiationsApi.preflight(tripId!, problemId!, focusConflictId ?? undefined),
    enabled: Boolean(tripId && problemId && enabled),
    staleTime: 15_000,
  });
}
