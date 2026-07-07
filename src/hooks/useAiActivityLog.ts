import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiActivityLogApi,
  isAiActivityLogUnavailable,
} from '@/api/ai-activity-log-client';
import { automationAuthorizationApi } from '@/api/automation-authorization-client';
import { travelStatusQueryKeys } from '@/hooks/useTravelStatus';
import { automationAuthorizationQueryKeys } from '@/hooks/useAutomationAuthorization';

export const aiActivityLogQueryKeys = {
  all: ['ai-activity-log'] as const,
  list: (tripId: string) => [...aiActivityLogQueryKeys.all, tripId, 'list'] as const,
  detail: (tripId: string, activityId: string) =>
    [...aiActivityLogQueryKeys.all, tripId, 'detail', activityId] as const,
};

export interface UseAiActivityLogOptions {
  tripId: string;
  activityId?: string | null;
  enabled?: boolean;
}

export function useAiActivityLog({
  tripId,
  activityId,
  enabled = true,
}: UseAiActivityLogOptions) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: aiActivityLogQueryKeys.list(tripId),
    queryFn: () => aiActivityLogApi.list(tripId),
    enabled: Boolean(tripId) && enabled,
    staleTime: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: aiActivityLogQueryKeys.detail(tripId, activityId ?? ''),
    queryFn: () => aiActivityLogApi.detail(tripId, activityId!),
    enabled: Boolean(tripId) && Boolean(activityId) && enabled,
    staleTime: 15_000,
  });

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: aiActivityLogQueryKeys.list(tripId) }),
      activityId
        ? queryClient.invalidateQueries({
            queryKey: aiActivityLogQueryKeys.detail(tripId, activityId),
          })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: travelStatusQueryKeys.status(tripId) }),
      queryClient.invalidateQueries({
        queryKey: automationAuthorizationQueryKeys.view(tripId),
      }),
    ]);
  }, [queryClient, tripId, activityId]);

  const undoMutation = useMutation({
    mutationFn: (logId: string) => automationAuthorizationApi.undoWork(tripId, logId),
    onSuccess: () => void invalidate(),
  });

  return {
    list: listQuery.data,
    detail: detailQuery.data,
    isLoading: listQuery.isLoading,
    isDetailLoading: detailQuery.isLoading,
    isFetching: listQuery.isFetching,
    isDetailFetching: detailQuery.isFetching,
    error: listQuery.error,
    detailError: detailQuery.error,
    isUnavailable: listQuery.error ? isAiActivityLogUnavailable(listQuery.error) : false,
    refresh: () => listQuery.refetch(),
    refreshDetail: () => detailQuery.refetch(),
    undo: undoMutation.mutateAsync,
    isUndoing: undoMutation.isPending,
    undoingLogId: undoMutation.variables,
  };
}
