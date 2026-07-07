import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptRecommended,
  getTravelStatus,
  isTravelStatusUnavailable,
  postTripIntent,
  scanMonitoring,
  travelStatusApi,
} from '@/api/travel-status-client';
import { executeDecisionQueueAction } from '@/lib/travel-status-decision-queue.util';
import type {
  DecisionQueueActionState,
  TripIntentPostBody,
  TripIntentRouteResult,
  TravelStatusResponse,
} from '@/api/travel-status.types';

export const travelStatusQueryKeys = {
  all: ['travel-status'] as const,
  status: (tripId: string) => [...travelStatusQueryKeys.all, tripId] as const,
};

export interface UseTravelStatusOptions {
  tripId: string;
  enabled?: boolean;
}

export function useTravelStatus({ tripId, enabled = true }: UseTravelStatusOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: travelStatusQueryKeys.status(tripId),
    queryFn: () => getTravelStatus(tripId),
    enabled: Boolean(tripId) && enabled,
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (isTravelStatusUnavailable(error)) return false;
      return failureCount < 2;
    },
  });

  const refresh = useCallback(async (): Promise<TravelStatusResponse | undefined> => {
    if (!tripId) return undefined;
    return queryClient.fetchQuery({
      queryKey: travelStatusQueryKeys.status(tripId),
      queryFn: () => getTravelStatus(tripId),
    });
  }, [queryClient, tripId]);

  const acceptMutation = useMutation({
    mutationFn: (problemId: string) => acceptRecommended(tripId, problemId),
    onSuccess: async () => {
      await refresh();
    },
  });

  const queueActionMutation = useMutation({
    mutationFn: (input: {
      problemId: string;
      actionState: DecisionQueueActionState;
      actionKind: 'keepOriginal' | 'defer';
    }) =>
      executeDecisionQueueAction({
        tripId,
        problemId: input.problemId,
        actionState: input.actionState,
        actionKind: input.actionKind,
      }),
    onSuccess: async () => {
      await refresh();
    },
  });

  const scanMutation = useMutation({
    mutationFn: (dayIndex: number) => scanMonitoring(tripId, dayIndex),
    onSuccess: async () => {
      await refresh();
    },
  });

  return {
    status: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isUnavailable: query.error ? isTravelStatusUnavailable(query.error) : false,
    refresh,
    acceptRecommended: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,
    acceptingProblemId: acceptMutation.variables,
    submitQueueAction: queueActionMutation.mutateAsync,
    isSubmittingQueueAction: queueActionMutation.isPending,
    submittingQueueAction: queueActionMutation.variables,
    scanMonitoring: scanMutation.mutateAsync,
    isScanning: scanMutation.isPending,
  };
}

export interface UseTripIntentOptions {
  tripId: string;
}

export function useTripIntent({ tripId }: UseTripIntentOptions) {
  const [preview, setPreview] = useState<TripIntentRouteResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intentMutation = useMutation({
    mutationFn: ({ body, dryRun }: { body: TripIntentPostBody; dryRun?: boolean }) =>
      postTripIntent(tripId, body, dryRun),
  });

  const previewIntent = useCallback(
    (message: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!message.trim()) {
        setPreview(null);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await postTripIntent(tripId, { message: message.trim() }, true);
          setPreview(result);
        } catch {
          setPreview(null);
        }
      }, 400);
    },
    [tripId],
  );

  const submitIntent = useCallback(
    async (body: TripIntentPostBody) => intentMutation.mutateAsync({ body, dryRun: false }),
    [intentMutation],
  );

  return {
    preview,
    previewIntent,
    submitIntent,
    isSubmitting: intentMutation.isPending,
    lastResult: intentMutation.data,
    clearPreview: () => setPreview(null),
  };
}

export { travelStatusApi };
