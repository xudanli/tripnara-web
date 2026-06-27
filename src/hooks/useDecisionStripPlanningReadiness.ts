import { useEffect, useMemo, useState } from 'react';
import { tripBudgetApi } from '@/api/trip-budget';
import {
  resolvePlanningReadinessPresentation,
  type PlanningReadinessPresentation,
} from '@/lib/decision-strip-planning-readiness';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';
import type { BudgetGateStatus } from '@/types/trip-budget';
import type { TripDetail } from '@/types/trip';

export function useDecisionStripPlanningReadiness(
  tripId: string | null | undefined,
  trip: TripDetail | null | undefined,
  conflicts: Pick<
    UsePlanningConflictsResult,
    'gateExecute' | 'items' | 'inbox' | 'loading'
  >,
  options?: { deferConstraintTopicsToCard?: boolean },
): PlanningReadinessPresentation | null {
  const [budgetGate, setBudgetGate] = useState<BudgetGateStatus | null>(null);

  useEffect(() => {
    if (!tripId) {
      setBudgetGate(null);
      return;
    }
    let cancelled = false;
    void tripBudgetApi
      .getProfile(tripId)
      .then((profile) => {
        if (!cancelled) setBudgetGate(profile.gateStatus ?? null);
      })
      .catch(() => {
        if (!cancelled) setBudgetGate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, conflicts.inbox.inboxCount]);

  useEffect(() => {
    const onRefresh = () => {
      if (!tripId) return;
      void tripBudgetApi
        .getProfile(tripId)
        .then((profile) => setBudgetGate(profile.gateStatus ?? null))
        .catch(() => setBudgetGate(null));
    };
    window.addEventListener('plan-studio:schedule-refresh', onRefresh);
    window.addEventListener('plan-studio:loop-readiness-changed', onRefresh);
    return () => {
      window.removeEventListener('plan-studio:schedule-refresh', onRefresh);
      window.removeEventListener('plan-studio:loop-readiness-changed', onRefresh);
    };
  }, [tripId]);

  return useMemo(() => {
    if (!tripId || conflicts.loading) return null;
    return resolvePlanningReadinessPresentation({
      gateExecute: conflicts.gateExecute,
      items: conflicts.items,
      inbox: conflicts.inbox,
      budgetGate,
      trip: trip ?? null,
      deferConstraintTopicsToCard: options?.deferConstraintTopicsToCard,
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
  ]);
}
