import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { odysseyIntakeApi } from '@/api/odyssey-intake';
import { DEFAULT_PROFILE_CARD_UI } from '@/features/odyssey-intake/constants/default-profile-card-ui';
import {
  applyTripIntentTag,
  mergeProfileCardView,
} from '@/features/odyssey-intake/lib/normalize-profile-card';
import {
  patchIncludesTripIntent,
  resolveSelectedTripIntentTag,
} from '@/features/odyssey-intake/lib/trip-intent';
import type { OdysseyProfileCardView } from '@/types/odyssey-intake';

const QUERY_KEY = ['odyssey-intake', 'profile', 'card'] as const;

export function useOdysseyProfileCard() {
  const queryClient = useQueryClient();
  const [localTripIntentTag, setLocalTripIntentTag] = useState<string | null>(null);

  const cardQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => odysseyIntakeApi.getProfileCard(),
    staleTime: 30_000,
    retry: 1,
  });

  const tripIntentMutation = useMutation({
    mutationFn: (tripIntentTag: string) =>
      odysseyIntakeApi.updateTripIntent({ tripIntentTag }),
    onMutate: async (tripIntentTag) => {
      setLocalTripIntentTag(tripIntentTag);
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<OdysseyProfileCardView>(QUERY_KEY);
      queryClient.setQueryData<OdysseyProfileCardView>(QUERY_KEY, (prev) =>
        applyTripIntentTag(prev, tripIntentTag)
      );
      return { previous };
    },
    onError: (_error, _tag, context) => {
      setLocalTripIntentTag(null);
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSuccess: (data, tripIntentTag) => {
      queryClient.setQueryData<OdysseyProfileCardView>(QUERY_KEY, (prev) =>
        mergeProfileCardView(prev, data)
      );

      const persisted = patchIncludesTripIntent(data);
      if (!persisted) {
        setLocalTripIntentTag(tripIntentTag);
        if (import.meta.env.DEV) {
          console.warn(
            '[Odyssey] PATCH /trip-intent 未返回 tripIntentTag(s)，已用本地选中态展示。请后端对齐字段。',
            data
          );
        }
      } else {
        setLocalTripIntentTag(null);
      }
    },
  });

  const ackRefreshMutation = useMutation({
    mutationFn: () => odysseyIntakeApi.ackProfileRefresh(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const ui = cardQuery.data?.ui ?? DEFAULT_PROFILE_CARD_UI;

  const dismissShimmer = useCallback(() => {
    if (ui.showShimmerRefresh) {
      ackRefreshMutation.mutate();
    }
  }, [ackRefreshMutation, ui.showShimmerRefresh]);

  const selectedTripIntentTag =
    localTripIntentTag ??
    resolveSelectedTripIntentTag(cardQuery.data, undefined);

  return {
    cardView: cardQuery.data ?? null,
    ui,
    isLoading: cardQuery.isLoading,
    isError: cardQuery.isError,
    completed: Boolean(cardQuery.data?.profile?.card ?? cardQuery.data?.completed),
    hasPersonaCard: Boolean(cardQuery.data?.profile?.card),
    shimmerActive: Boolean(ui.showShimmerRefresh),
    refreshMessage: ui.refreshMessage ?? cardQuery.data?.profile?.profileRefreshMessage,
    selectedTripIntentTag,
    updateTripIntent: tripIntentMutation.mutateAsync,
    isUpdatingIntent: tripIntentMutation.isPending,
    dismissShimmer,
    refetch: cardQuery.refetch,
  };
}

export function invalidateOdysseyProfileCard(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}
