import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTravelStatus, useTripIntent } from '@/hooks/useTravelStatus';
import { handleTripIntentResult } from '@/lib/travel-status-intent.util';
import { resolveSuggestedConfirmCount } from '@/lib/travel-status-display.util';
import { buildPlanStudioDecisionProblemPath } from '@/lib/plan-studio-decision-navigation.util';
import {
  acceptTripDecisionViaIntent,
  resolveUnifiedDecisionQueueItems,
  resolveUnifiedMonitoringCount,
  resolveUnifiedOpenDecisionCount,
  useTripTravelContext,
} from '@/features/trip-context';
import type { DecisionQueueActionState } from '@/api/travel-status.types';

export function useTravelStatusSurface(tripId: string) {
  const navigate = useNavigate();

  const {
    status,
    isLoading,
    isFetching,
    error,
    isUnavailable,
    refresh,
    acceptRecommended,
    isAccepting,
    acceptingProblemId,
    submitQueueAction,
    isSubmittingQueueAction,
    submittingQueueAction,
    scanMonitoring,
    isScanning,
  } = useTravelStatus({ tripId });

  const { preview, previewIntent, submitIntent, isSubmitting, clearPreview } = useTripIntent({
    tripId,
  });

  const {
    enabled: tripContextEnabled,
    ready: tripContextReady,
    openDecisionCount: contextOpenDecisionCount,
    monitoringCount: contextMonitoringCount,
    decisionsView,
    submitTripIntent,
    refresh: refreshTripContext,
  } = useTripTravelContext();

  const pendingVerificationCount = status?.pendingVerification?.items?.length ?? 0;
  const hasInlineVerificationItems = pendingVerificationCount > 0;
  const suggestedConfirmCount = useMemo(
    () =>
      status
        ? resolveSuggestedConfirmCount({
            issueCount: status.executability.issueCount,
            pendingVerificationCount,
            executabilityHeadline: status.executability.headline,
          })
        : 0,
    [status, pendingVerificationCount],
  );

  const decisionQueueItems = useMemo(
    () =>
      resolveUnifiedDecisionQueueItems({
        travelContextEnabled: tripContextEnabled,
        travelContextReady: tripContextReady,
        decisionsView,
        bffItems: status?.openDecisions ?? [],
      }),
    [tripContextEnabled, tripContextReady, decisionsView, status?.openDecisions],
  );

  const openDecisionCount = resolveUnifiedOpenDecisionCount({
    travelContextEnabled: tripContextEnabled,
    travelContextReady: tripContextReady,
    contextOpenCount: contextOpenDecisionCount,
    bffOpenCount: status?.openDecisions.length ?? 0,
  });

  const monitoringAlerts = resolveUnifiedMonitoringCount({
    travelContextEnabled: tripContextEnabled,
    travelContextReady: tripContextReady,
    contextMonitoringCount: contextMonitoringCount,
    bffMonitoringCount: status?.monitoring?.activeCount ?? 0,
  });

  const handleRefreshAll = useCallback(async () => {
    const next = await refresh();
    if (tripContextEnabled) {
      await refreshTripContext();
    }
    return next;
  }, [refresh, refreshTripContext, tripContextEnabled]);

  const handleViewAlternatives = useCallback(
    (problemId: string) => {
      navigate(buildPlanStudioDecisionProblemPath(tripId, problemId, { fromTravel: true }));
    },
    [navigate, tripId],
  );

  const handleQueueSecondaryAction = useCallback(
    async (
      problemId: string,
      actionState: DecisionQueueActionState | undefined,
      actionKind: 'keepOriginal' | 'defer',
    ) => {
      if (!actionState) return;
      try {
        await submitQueueAction({ problemId, actionState, actionKind });
      } catch (err) {
        toast.error((err as Error)?.message ?? '操作失败');
      }
    },
    [submitQueueAction],
  );

  const handleAcceptRecommended = useCallback(
    async (problemId: string) => {
      try {
        const prevVersion = status?.effectivePlan?.versionId;
        if (tripContextEnabled && tripContextReady) {
          await acceptTripDecisionViaIntent(submitTripIntent, decisionsView, problemId);
        } else {
          await acceptRecommended(problemId);
        }
        const next = await handleRefreshAll();
        const nextVersion = next?.effectivePlan?.versionId;
        if (nextVersion && nextVersion !== prevVersion) {
          toast.success('行程已更新', { description: '当前有效行程版本已变更' });
        } else {
          toast.success('已接受推荐方案');
        }
      } catch (err) {
        toast.error((err as Error)?.message ?? '接受方案失败');
      }
    },
    [
      acceptRecommended,
      handleRefreshAll,
      tripContextEnabled,
      tripContextReady,
      submitTripIntent,
      decisionsView,
      status?.effectivePlan?.versionId,
    ],
  );

  const handleIntentSubmit = useCallback(
    async (message: string, scrollToDecisionQueue?: () => void) => {
      try {
        const result = await submitIntent({ message });
        clearPreview();
        handleTripIntentResult(result, {
          navigate,
          tripId,
          scrollToDecisionQueue,
        });
        await handleRefreshAll();
        return result;
      } catch (err) {
        toast.error((err as Error)?.message ?? '无法理解该请求');
        throw err;
      }
    },
    [submitIntent, clearPreview, navigate, tripId, handleRefreshAll],
  );

  const handleRefreshMonitoring = useCallback(async () => {
    try {
      await scanMonitoring(0);
      if (tripContextEnabled) {
        await refreshTripContext();
      }
      toast.success('监控已刷新');
    } catch (err) {
      toast.error((err as Error)?.message ?? '刷新监控失败');
    }
  }, [scanMonitoring, tripContextEnabled, refreshTripContext]);

  return {
    status,
    isLoading,
    isFetching,
    error,
    isUnavailable,
    preview,
    previewIntent,
    isSubmitting,
    isAccepting,
    acceptingProblemId,
    isSubmittingQueueAction,
    submittingQueueAction,
    isScanning,
    decisionQueueItems,
    openDecisionCount,
    suggestedConfirmCount,
    hasInlineVerificationItems,
    pendingVerificationCount,
    monitoringAlerts,
    handleRefreshAll,
    handleViewAlternatives,
    handleQueueSecondaryAction,
    handleAcceptRecommended,
    handleIntentSubmit,
    handleRefreshMonitoring,
    refresh,
  };
}
