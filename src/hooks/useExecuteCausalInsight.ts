import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { decisionProblemsApi } from '@/api/decision-problems';
import {
  mergeExecuteCausalInsight,
  resolveExecuteCausalTraceTier3ProblemId,
} from '@/lib/execute-causal-insight.util';
import type { ExecuteCausalInsightView } from '@/lib/execute-causal-insight.util';
import type { TripExecutionAdvisoryDto } from '@/types/trip-execution-advisory';

export const executeCausalTraceKeys = {
  all: ['execution-causal-trace'] as const,
  trip: (tripId: string, problemId: string) =>
    [...executeCausalTraceKeys.all, tripId, problemId] as const,
};

export interface UseExecuteCausalInsightResult {
  insight: ExecuteCausalInsightView | null;
  loading: boolean;
  isFetching: boolean;
  tier3Enabled: boolean;
  refetch: () => void;
}

/**
 * 行中因果链 · P0 execution-advisory.causalInsight + Tier-3 causal-trace
 */
export function useExecuteCausalInsight(
  tripId: string | null | undefined,
  advisory: TripExecutionAdvisoryDto | null | undefined,
  options?: {
    enabled?: boolean;
    overviewTabActive?: boolean;
    allowDemoFallback?: boolean;
  },
): UseExecuteCausalInsightResult {
  const tier3ProblemId = useMemo(
    () => resolveExecuteCausalTraceTier3ProblemId(advisory),
    [advisory],
  );

  const tier3Enabled =
    options?.enabled !== false &&
    Boolean(tripId) &&
    Boolean(tier3ProblemId) &&
    options?.overviewTabActive !== false;

  const {
    data: traceReplay,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: executeCausalTraceKeys.trip(tripId ?? '', tier3ProblemId ?? ''),
    queryFn: () => decisionProblemsApi.getCausalTrace(tripId!, tier3ProblemId!),
    enabled: tier3Enabled,
    staleTime: 30_000,
    retry: false,
  });

  const insight = useMemo(
    () =>
      mergeExecuteCausalInsight(advisory, traceReplay ?? null, {
        allowDemoFallback: options?.allowDemoFallback,
      }),
    [advisory, traceReplay, options?.allowDemoFallback],
  );

  const loading = tier3Enabled && isLoading && !traceReplay;

  return {
    insight,
    loading,
    isFetching,
    tier3Enabled,
    refetch: () => {
      void refetch();
    },
  };
}
