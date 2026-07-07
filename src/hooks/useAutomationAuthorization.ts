import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/api/trips';
import {
  automationAuthorizationApi,
  getAutomationAuthorization,
  isAutomationAuthorizationUnavailable,
  isConstraintsStaleError,
} from '@/api/automation-authorization-client';
import { tripContextSnapshotApi } from '@/api/travel-status-client';
import { getTravelStatus } from '@/api/travel-status-client';
import { tripConstraintsApi } from '@/api/trip-constraints';
import type {
  AutomationAuthorizationView,
  PatchAutomationAuthorizationBody,
  PutUserAutomationAuthorizationTemplateBody,
} from '@/api/automation-authorization.types';
import {
  isAutomationAuthorizationViewReady,
} from '@/lib/automation-authorization-normalize.util';
import { workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';
import { travelStatusQueryKeys } from '@/hooks/useTravelStatus';

export const automationAuthorizationQueryKeys = {
  all: ['automation-authorization'] as const,
  view: (tripId: string) => [...automationAuthorizationQueryKeys.all, tripId] as const,
  userTemplate: ['automation-authorization', 'user-template'] as const,
  contextSnapshot: (tripId: string) => ['context-snapshot', tripId, 'automation'] as const,
};

export type AutomationAuthorizationViewSource = 'aggregation' | 'fallback';

export interface AutomationAuthorizationQueryResult {
  view: AutomationAuthorizationView;
  source: AutomationAuthorizationViewSource;
}

async function fetchAutomationAuthorizationView(
  tripId: string,
): Promise<AutomationAuthorizationQueryResult> {
  try {
    const view = await getAutomationAuthorization(tripId);
    return { view, source: 'aggregation' };
  } catch (err) {
    if (!isAutomationAuthorizationUnavailable(err)) throw err;

    const [constraintsRes, travelStatus] = await Promise.all([
      tripConstraintsApi.list(tripId),
      getTravelStatus(tripId).catch(() => null),
    ]);

    return {
      source: 'fallback',
      view: {
        tripId,
        scope: 'TRIP',
        constraintsVersion: constraintsRes.meta?.constraintsVersion ?? 0,
        automationPaused: travelStatus?.automation?.paused ?? false,
        contract: constraintsRes.contract ?? {},
        travelStatus: {
          automation: travelStatus?.automation ?? {
            defaultLevel: 'SUGGEST',
            defaultLevelLabel: '建议执行',
            uiLevel: 'L2',
            uiLevelLabel: '建议执行',
            tierCounts: { auto: 0, ask: 0, deny: 0 },
            paused: false,
            catalog: { groups: [] },
          },
          aiCompletedWork: travelStatus?.aiCompletedWork ?? { items: [] },
        },
      },
    };
  }
}

export interface UseAutomationAuthorizationOptions {
  tripId: string;
  enabled?: boolean;
}

export function useAutomationAuthorization({
  tripId,
  enabled = true,
}: UseAutomationAuthorizationOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: automationAuthorizationQueryKeys.view(tripId),
    queryFn: () => fetchAutomationAuthorizationView(tripId),
    enabled: Boolean(tripId) && enabled,
    staleTime: 30_000,
  });

  const view = query.data?.view;
  const source = query.data?.source ?? 'aggregation';
  const isReady = isAutomationAuthorizationViewReady(view);
  const isDegraded = source === 'fallback';
  const isPageLoading = query.isLoading || (query.isFetching && !isReady && !isDegraded);

  const contextSnapshotQuery = useQuery({
    queryKey: automationAuthorizationQueryKeys.contextSnapshot(tripId),
    queryFn: () => tripContextSnapshotApi.getSnapshot(tripId),
    enabled: Boolean(tripId) && enabled,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (isAutomationAuthorizationUnavailable(error)) return false;
      return failureCount < 1;
    },
  });

  const userTemplateQuery = useQuery({
    queryKey: automationAuthorizationQueryKeys.userTemplate,
    queryFn: () => automationAuthorizationApi.getUserTemplate(),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (isAutomationAuthorizationUnavailable(error)) return false;
      return failureCount < 1;
    },
  });

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: automationAuthorizationQueryKeys.view(tripId) }),
      queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) }),
      queryClient.invalidateQueries({ queryKey: travelStatusQueryKeys.status(tripId) }),
      queryClient.invalidateQueries({ queryKey: automationAuthorizationQueryKeys.userTemplate }),
    ]);
  }, [queryClient, tripId]);

  const patchMutation = useMutation({
    mutationFn: (body: PatchAutomationAuthorizationBody) =>
      automationAuthorizationApi.patch(tripId, body),
    onSuccess: () => void invalidate(),
  });

  const saveWithRetry = useCallback(
    async (body: PatchAutomationAuthorizationBody) => {
      try {
        return await patchMutation.mutateAsync(body);
      } catch (err) {
        if (!isConstraintsStaleError(err)) throw err;
        const fresh = await fetchAutomationAuthorizationView(tripId);
        return patchMutation.mutateAsync({
          ...body,
          constraintsVersion: fresh.view.constraintsVersion,
        });
      }
    },
    [patchMutation, tripId],
  );

  const pauseMutation = useMutation({
    mutationFn: (paused: boolean) =>
      automationAuthorizationApi.pause(tripId, {
        paused,
        constraintsVersion: view?.constraintsVersion,
      }),
    onSuccess: () => void invalidate(),
  });

  const resetMutation = useMutation({
    mutationFn: () => automationAuthorizationApi.resetDefaults(tripId),
    onSuccess: () => void invalidate(),
  });

  const undoMutation = useMutation({
    mutationFn: (logId: string) => automationAuthorizationApi.undoWork(tripId, logId),
    onSuccess: () => void invalidate(),
  });

  const saveUserTemplateMutation = useMutation({
    mutationFn: (body: PutUserAutomationAuthorizationTemplateBody) =>
      automationAuthorizationApi.putUserTemplate(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automationAuthorizationQueryKeys.userTemplate,
      });
    },
  });

  const resetUserTemplateMutation = useMutation({
    mutationFn: () => automationAuthorizationApi.resetUserTemplateDefaults(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automationAuthorizationQueryKeys.userTemplate,
      });
    },
  });

  return {
    view,
    isReady,
    isDegraded,
    isPageLoading,
    contextSnapshot: contextSnapshotQuery.data,
    userTemplate: userTemplateQuery.data ?? view?.userTemplate ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isContextSnapshotLoading: contextSnapshotQuery.isLoading,
    isContextSnapshotFetching: contextSnapshotQuery.isFetching,
    isUserTemplateLoading: userTemplateQuery.isLoading,
    error: query.error,
    isUnavailable: isDegraded,
    refresh: () => query.refetch(),
    refreshContextSnapshot: () => contextSnapshotQuery.refetch(),
    refreshUserTemplate: () => userTemplateQuery.refetch(),
    save: saveWithRetry,
    isSaving: patchMutation.isPending,
    saveUserTemplate: saveUserTemplateMutation.mutateAsync,
    isSavingUserTemplate: saveUserTemplateMutation.isPending,
    pause: pauseMutation.mutateAsync,
    isPausing: pauseMutation.isPending,
    resetDefaults: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
    resetUserTemplateDefaults: resetUserTemplateMutation.mutateAsync,
    isResettingUserTemplate: resetUserTemplateMutation.isPending,
    undoWork: undoMutation.mutateAsync,
    isUndoing: undoMutation.isPending,
    undoingLogId: undoMutation.variables,
  };
}

export async function loadTripForAutomationHeader(tripId: string) {
  return tripsApi.getById(tripId);
}
