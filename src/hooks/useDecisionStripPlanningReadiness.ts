import { useMemo } from 'react';
import {
  resolvePlanningReadinessPresentation,
  type PlanningReadinessPresentation,
} from '@/lib/decision-strip-planning-readiness';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripDetail } from '@/types/trip';

export function useDecisionStripPlanningReadiness(
  tripId: string | null | undefined,
  trip: TripDetail | null | undefined,
  conflicts: Pick<
    UsePlanningConflictsResult,
    'gateExecute' | 'items' | 'inbox' | 'loading'
  >,
  options?: {
    deferConstraintTopicsToCard?: boolean;
    budgetProfile?: TripBudgetProfile | null;
    useDecisionProblemsBff?: boolean;
    openDecisionProblemCount?: number;
  },
): PlanningReadinessPresentation | null {
  const budgetGate = options?.budgetProfile?.gateStatus ?? null;

  return useMemo(() => {
    if (!tripId || conflicts.loading) return null;
    return resolvePlanningReadinessPresentation({
      gateExecute: conflicts.gateExecute,
      items: conflicts.items,
      inbox: conflicts.inbox,
      budgetGate,
      trip: trip ?? null,
      deferConstraintTopicsToCard: options?.deferConstraintTopicsToCard,
      useDecisionProblemsBff: options?.useDecisionProblemsBff,
      openDecisionProblemCount: options?.openDecisionProblemCount,
    });
  }, [
    tripId,
    trip,
    conflicts.gateExecute,
    conflicts.items,
    conflicts.inbox,
    conflicts.loading,
    budgetGate,
    options?.deferConstraintTopicsToCard,
    options?.useDecisionProblemsBff,
    options?.openDecisionProblemCount,
  ]);
}
