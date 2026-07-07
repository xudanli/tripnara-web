import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { travelStatusQueryKeys } from '@/hooks/useTravelStatus';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { useTripTravelContext } from '@/features/trip-context';

/** 探索物化 / Context 变更后，统一刷新 travel-status + Trip Context */
export function useTripWorldStateSync(tripId: string) {
  const queryClient = useQueryClient();
  const { refresh: refreshTravelStatus } = useTripStatusBarModel(tripId);
  const {
    enabled: contextEnabled,
    refresh: refreshContext,
    revision,
  } = useTripTravelContext();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAll = useCallback(async () => {
    if (!tripId) return;
    setIsSyncing(true);
    try {
      if (contextEnabled) {
        await refreshContext();
      }
      await queryClient.invalidateQueries({ queryKey: travelStatusQueryKeys.status(tripId) });
      await refreshTravelStatus();
    } finally {
      setIsSyncing(false);
    }
  }, [tripId, contextEnabled, refreshContext, queryClient, refreshTravelStatus]);

  return {
    syncAll,
    isSyncing,
    contextRevision: revision,
    contextEnabled,
  };
}
