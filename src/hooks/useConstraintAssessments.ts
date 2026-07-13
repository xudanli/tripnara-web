import { useQuery } from '@tanstack/react-query';
import { fetchConstraintAssessmentsWithExecutabilityFallback } from '@/lib/frontend-constraint-assessment-fallback.util';
import { constraintAssessmentKeys } from '@/lib/constraint-assessment-query.util';
import type { UnifiedConstraintAssessmentBundle } from '@/types/frontend-constraint-assessment-api.types';

const STALE_MS = 30_000;

export interface UseConstraintAssessmentsOptions {
  enabled?: boolean;
  refresh?: boolean;
}

export function useConstraintAssessments(
  tripId: string | null | undefined,
  options?: UseConstraintAssessmentsOptions,
) {
  const enabled = options?.enabled !== false && Boolean(tripId);
  const refresh = options?.refresh === true;

  return useQuery<UnifiedConstraintAssessmentBundle | null>({
    queryKey: constraintAssessmentKeys.bundle(tripId ?? '', refresh),
    queryFn: async () => {
      if (!tripId) return null;
      return fetchConstraintAssessmentsWithExecutabilityFallback(tripId, { refresh });
    },
    enabled,
    staleTime: STALE_MS,
  });
}
