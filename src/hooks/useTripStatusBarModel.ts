import { useCallback, useMemo } from 'react';
import { useTravelStatus } from '@/hooks/useTravelStatus';
import {
  buildTripStatusBarViewModel,
  type TripStatusBarViewModel,
} from '@/lib/trip-status-bar.util';
import { resolveSuggestedConfirmCount } from '@/lib/travel-status-display.util';
import {
  resolveUnifiedMonitoringCount,
  resolveUnifiedOpenDecisionCount,
  useTripTravelContext,
} from '@/features/trip-context';

export function useTripStatusBarModel(tripId: string, enabled = true) {
  const { status, isLoading, isFetching, isUnavailable, refresh } = useTravelStatus({
    tripId,
    enabled: Boolean(tripId) && enabled,
  });

  const {
    enabled: tripContextEnabled,
    ready: tripContextReady,
    openDecisionCount: contextOpenDecisionCount,
    monitoringCount: contextMonitoringCount,
    refresh: refreshTripContext,
  } = useTripTravelContext();

  const model = useMemo((): TripStatusBarViewModel | null => {
    if (!status) return null;
    const pendingVerificationCount = status.pendingVerification?.items?.length ?? 0;
    const suggestedConfirmCount = resolveSuggestedConfirmCount({
      issueCount: status.executability.issueCount,
      pendingVerificationCount,
      executabilityHeadline: status.executability.headline,
    });
    const monitoringCount = resolveUnifiedMonitoringCount({
      travelContextEnabled: tripContextEnabled,
      travelContextReady: tripContextReady,
      contextMonitoringCount: contextMonitoringCount,
      bffMonitoringCount: status.monitoring?.activeCount ?? 0,
    });

    return buildTripStatusBarViewModel(status, {
      monitoring: monitoringCount,
      needsConfirm: Math.max(pendingVerificationCount, suggestedConfirmCount),
    });
  }, [
    status,
    tripContextEnabled,
    tripContextReady,
    contextOpenDecisionCount,
    contextMonitoringCount,
  ]);

  const refreshAll = useCallback(async () => {
    await refresh();
    if (tripContextEnabled) {
      await refreshTripContext();
    }
  }, [refresh, refreshTripContext, tripContextEnabled]);

  return {
    model,
    status,
    isLoading,
    isFetching,
    isUnavailable,
    refresh: refreshAll,
  };
}
