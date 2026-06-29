import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tripBudgetApi } from '@/api/trip-budget';
import { tripConstraintsApi } from '@/api/trip-constraints';
import { tripWishesApi } from '@/api/trip-wishes';
import { tripsApi } from '@/api/trips';
import {
  clearDecisionCheckerDeferredStore,
  discardStaleDecisionCheckerDeferred,
  ensureDecisionCheckerDeferredPolling,
  getActiveDecisionCheckerTaskId,
  registerDecisionCheckerDeferred,
  setDecisionCheckerDeferredReady,
} from '@/lib/decision-checker-deferred.store';
import { PLAN_STUDIO_CONSTRAINTS_CHANGED } from '@/lib/plan-studio-constraints-events';
import type { PlanningConflictsResponse } from '@/types/planning-conflicts';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';
import type { WishSummary } from '@/types/trip-wishes';
import type { Collaborator, TripDetail } from '@/types/trip';

const STALE_MS = 30_000;

export interface WorkbenchPlanningConflictsQueryOpts {
  includeDecisionChecker?: boolean;
  focusConflictId?: string | null;
  constraintsVersion?: number | null;
}

function planningConflictsKey(
  tripId: string,
  opts?: WorkbenchPlanningConflictsQueryOpts,
) {
  return [
    ...workbenchKeys.trip(tripId),
    'planning-conflicts',
    {
      dc: opts?.includeDecisionChecker ?? true,
      focus: opts?.focusConflictId ?? null,
      cv: opts?.constraintsVersion ?? null,
    },
  ] as const;
}

export const workbenchKeys = {
  all: ['workbench'] as const,
  trip: (tripId: string) => [...workbenchKeys.all, tripId] as const,
  constraints: (tripId: string) => [...workbenchKeys.trip(tripId), 'constraints'] as const,
  planningConflicts: planningConflictsKey,
  wishSummary: (tripId: string) => [...workbenchKeys.trip(tripId), 'wishes', 'summary'] as const,
  budgetProfile: (tripId: string) => [...workbenchKeys.trip(tripId), 'budget', 'profile'] as const,
  collaborators: (tripId: string) => [...workbenchKeys.trip(tripId), 'collaborators'] as const,
};

async function fetchWishSummary(tripId: string): Promise<WishSummary | null> {
  try {
    return await tripWishesApi.getWorkbenchSummary(tripId);
  } catch {
    try {
      return await tripWishesApi.getSummary(tripId);
    } catch {
      return null;
    }
  }
}

/** 首包 includeDecisionChecker=1 仅一次；之后只 poll decisionCheckerTaskId */
async function fetchWorkbenchPlanningConflicts(
  tripId: string,
  queryOpts: WorkbenchPlanningConflictsQueryOpts,
): Promise<PlanningConflictsResponse> {
  const includeDecisionChecker = queryOpts.includeDecisionChecker ?? true;
  discardStaleDecisionCheckerDeferred(tripId);
  const activeTaskId = getActiveDecisionCheckerTaskId(tripId);

  const res = await tripsApi.getPlanningConflicts(tripId, {
    includeConstraintsSummary: true,
    ...(activeTaskId
      ? { decisionCheckerTaskId: activeTaskId }
      : includeDecisionChecker
        ? { includeDecisionChecker: true }
        : {}),
    focusConflictId: queryOpts.focusConflictId ?? undefined,
    constraintsVersion: queryOpts.constraintsVersion ?? undefined,
  });

  if (res.decisionChecker) {
    setDecisionCheckerDeferredReady(tripId, res.decisionChecker);
  } else if (res.decisionCheckerDeferred?.taskId) {
    registerDecisionCheckerDeferred(tripId, res.decisionCheckerDeferred);
    ensureDecisionCheckerDeferredPolling(tripId);
  }

  return res;
}

export function useWorkbenchTripConstraints(
  tripId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: workbenchKeys.constraints(tripId ?? ''),
    queryFn: () => tripConstraintsApi.list(tripId!),
    enabled: Boolean(tripId) && enabled,
    staleTime: STALE_MS,
  });
}

export function useWorkbenchPlanningConflicts(
  tripId: string | null | undefined,
  options?: WorkbenchPlanningConflictsQueryOpts & { enabled?: boolean },
) {
  const includeDecisionChecker = options?.includeDecisionChecker ?? true;
  const enabled = options?.enabled !== false && Boolean(tripId);
  const queryOpts: WorkbenchPlanningConflictsQueryOpts = {
    includeDecisionChecker,
    focusConflictId: options?.focusConflictId ?? null,
    constraintsVersion: options?.constraintsVersion ?? null,
  };

  return useQuery({
    queryKey: workbenchKeys.planningConflicts(tripId ?? '', queryOpts),
    queryFn: () => fetchWorkbenchPlanningConflicts(tripId!, queryOpts),
    enabled,
    staleTime: STALE_MS,
  });
}

export function useWorkbenchWishSummary(tripId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workbenchKeys.wishSummary(tripId ?? ''),
    queryFn: () => fetchWishSummary(tripId!),
    enabled: Boolean(tripId) && enabled,
    staleTime: STALE_MS,
  });
}

export function useWorkbenchBudgetProfile(tripId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workbenchKeys.budgetProfile(tripId ?? ''),
    queryFn: () => tripBudgetApi.getProfile(tripId!),
    enabled: Boolean(tripId) && enabled,
    staleTime: STALE_MS,
  });
}

export function useWorkbenchCollaborators(tripId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: workbenchKeys.collaborators(tripId ?? ''),
    queryFn: async (): Promise<Collaborator[]> => {
      const data = await tripsApi.getCollaborators(tripId!);
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(tripId) && enabled,
    staleTime: STALE_MS,
  });
}

/** 顶栏可行度：优先 BFF overallScore，否则由冲突摘要估算（避免单独 GET feasibility-report） */
export function deriveWorkbenchFeasibilityScore(
  bundle: PlanningConflictsResponse | null | undefined,
): number | null {
  if (!bundle) return null;

  const explicit = (bundle as PlanningConflictsResponse & { overallScore?: number }).overallScore;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return Math.round(explicit);
  }

  const { total, mustHandle, suggestAdjust } = bundle.summary;
  if (total === 0 && !bundle.isStale) return 100;

  const penalty = mustHandle * 12 + suggestAdjust * 4 + (bundle.isStale ? 5 : 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export async function invalidateWorkbenchPlanningConflicts(
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string,
) {
  clearDecisionCheckerDeferredStore(tripId);
  await queryClient.invalidateQueries({
    queryKey: workbenchKeys.trip(tripId),
    predicate: (query) => query.queryKey.includes('planning-conflicts'),
  });
}

export async function invalidateWorkbenchConstraints(
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string,
) {
  await queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) });
}

export async function invalidateWorkbenchScheduleData(
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string,
) {
  await queryClient.invalidateQueries({ queryKey: workbenchKeys.trip(tripId) });
}

export async function invalidateWorkbenchAfterConstraintChange(
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string,
  options?: { skipConstraintsList?: boolean },
) {
  await Promise.all([
    ...(options?.skipConstraintsList
      ? []
      : [queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) })]),
    invalidateWorkbenchPlanningConflicts(queryClient, tripId),
  ]);
}

export async function invalidateWorkbenchWishSummary(
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string,
) {
  await queryClient.invalidateQueries({ queryKey: workbenchKeys.wishSummary(tripId) });
}

/** 规划工作台唯一 schedule-refresh 订阅点（避免各 hook 重复监听扇出） */
export function useWorkbenchScheduleRefresh(tripId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId) return;

    const handler = () => {
      void invalidateWorkbenchScheduleData(queryClient, tripId);
    };

    window.addEventListener('plan-studio:schedule-refresh', handler);
    window.addEventListener('plan-studio:loop-readiness-changed', handler);
    window.addEventListener(PLAN_STUDIO_CONSTRAINTS_CHANGED, handler);
    return () => {
      window.removeEventListener('plan-studio:schedule-refresh', handler);
      window.removeEventListener('plan-studio:loop-readiness-changed', handler);
      window.removeEventListener(PLAN_STUDIO_CONSTRAINTS_CHANGED, handler);
    };
  }, [tripId, queryClient]);
}

export type WorkbenchConstraintsList = TripConstraintsListResponse;
export type WorkbenchBudgetProfile = TripBudgetProfile;
export type WorkbenchTrip = TripDetail;
