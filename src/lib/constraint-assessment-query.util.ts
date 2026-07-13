import type { QueryClient } from '@tanstack/react-query';
import { workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';

export const constraintAssessmentKeys = {
  all: (tripId: string) => [...workbenchKeys.trip(tripId), 'constraint-assessments'] as const,
  bundle: (tripId: string, refresh?: boolean) =>
    [...constraintAssessmentKeys.all(tripId), { refresh: refresh ?? false }] as const,
  consoleWithAssessments: (tripId: string) =>
    [...workbenchKeys.trip(tripId), 'constraint-console-with-assessments'] as const,
};

/** 约束 PATCH / validate / 行程 PUT 后失效 */
export async function invalidateConstraintAssessmentQueries(
  queryClient: QueryClient,
  tripId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) }),
    queryClient.invalidateQueries({ queryKey: constraintAssessmentKeys.all(tripId) }),
    queryClient.invalidateQueries({
      queryKey: constraintAssessmentKeys.consoleWithAssessments(tripId),
    }),
    queryClient.invalidateQueries({ queryKey: [...workbenchKeys.trip(tripId), 'executability'] }),
  ]);
}
