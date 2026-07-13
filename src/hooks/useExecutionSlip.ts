import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mobileExecutionApi, MobileExecutionApiError } from '@/api/mobile-execution';
import { executionTepKeys } from '@/hooks/useExecutionTep';
import { executionOverviewKeys } from '@/hooks/useExecutionOverview';
import {
  buildDepartureSlipRequest,
  pollSlipDecisionProblemId,
  resolvePlannedDepartAt,
  resolveSelectedRepairOptionId,
} from '@/lib/execution-slip.util';
import { areDecisionAcknowledgementsComplete } from '@/lib/decision-acknowledgement.util';
import type {
  ConsumerDecisionItem,
  DepartureSlipResponse,
  MobileContextSnapshotDto,
  MobileTodayItineraryDto,
} from '@/types/mobile-execution';

export const executionSlipKeys = {
  all: ['execution-slip'] as const,
  trip: (tripId: string) => [...executionSlipKeys.all, tripId] as const,
  snapshot: (tripId: string) => [...executionSlipKeys.trip(tripId), 'snapshot'] as const,
  itinerary: (tripId: string) => [...executionSlipKeys.trip(tripId), 'itinerary'] as const,
  decision: (tripId: string, problemId: string) =>
    [...executionSlipKeys.trip(tripId), 'decision', problemId] as const,
};

export interface UseExecutionSlipOptions {
  enabled?: boolean;
  tripDayDate?: string | null;
}

export interface UseExecutionSlipResult {
  snapshot: MobileContextSnapshotDto | null;
  itinerary: MobileTodayItineraryDto | null;
  canReportSlip: boolean;
  currentActivityId: string | null;
  loading: boolean;
  submittingSlip: boolean;
  decision: ConsumerDecisionItem | null;
  decisionLoading: boolean;
  decisionProblemId: string | null;
  applyingDecision: boolean;
  openDecision: (problemId: string) => void;
  closeDecision: () => void;
  submitDepartureSlip: (input: {
    delayMinutes: number;
    stillAtPoi: boolean;
  }) => Promise<DepartureSlipResponse>;
  acceptScheduleDecision: (input: {
    selectedOptionId?: string | null;
    acknowledgements: string[];
  }) => Promise<void>;
  reloadContext: () => Promise<void>;
}

async function loadConsumerDecisionWithPoll(
  tripId: string,
  problemId: string,
): Promise<ConsumerDecisionItem> {
  try {
    return await mobileExecutionApi.getConsumerDecisionItem(tripId, problemId);
  } catch (err) {
    const status = err instanceof MobileExecutionApiError ? err.status : undefined;
    if (status !== 404) throw err;
    const polledId = await pollSlipDecisionProblemId(tripId, problemId);
    if (!polledId) throw err;
    return mobileExecutionApi.getConsumerDecisionItem(tripId, polledId);
  }
}

export function useExecutionSlip(
  tripId: string | null | undefined,
  options?: UseExecutionSlipOptions,
): UseExecutionSlipResult {
  const enabled = Boolean(tripId) && options?.enabled !== false;
  const queryClient = useQueryClient();
  const [decisionProblemId, setDecisionProblemId] = useState<string | null>(null);
  const [submittingSlip, setSubmittingSlip] = useState(false);
  const [applyingDecision, setApplyingDecision] = useState(false);

  const snapshotQuery = useQuery({
    queryKey: executionSlipKeys.snapshot(tripId ?? ''),
    queryFn: () => mobileExecutionApi.getMobileContextSnapshot(tripId!),
    enabled,
    staleTime: 15_000,
  });

  const itineraryQuery = useQuery({
    queryKey: executionSlipKeys.itinerary(tripId ?? ''),
    queryFn: () => mobileExecutionApi.getTodayItinerary(tripId!),
    enabled,
    staleTime: 15_000,
  });

  const decisionQuery = useQuery({
    queryKey: executionSlipKeys.decision(tripId ?? '', decisionProblemId ?? ''),
    queryFn: () => loadConsumerDecisionWithPoll(tripId!, decisionProblemId!),
    enabled: enabled && Boolean(decisionProblemId),
    staleTime: 0,
  });

  const snapshot = snapshotQuery.data ?? null;
  const itinerary = itineraryQuery.data ?? null;
  const currentActivityId = snapshot?.execution?.currentActivityID ?? null;
  const canReportSlip =
    snapshot?.lifecycle === 'traveling' &&
    Boolean(currentActivityId) &&
    Boolean(snapshot?.execution);

  const currentActivityItem = useMemo(
    () => itinerary?.items.find((item) => item.id === currentActivityId) ?? null,
    [currentActivityId, itinerary?.items],
  );

  const invalidateSurface = useCallback(async () => {
    if (!tripId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: executionOverviewKeys.trip(tripId) }),
      queryClient.invalidateQueries({ queryKey: executionSlipKeys.trip(tripId) }),
      queryClient.invalidateQueries({ queryKey: executionTepKeys.trip(tripId) }),
    ]);
  }, [queryClient, tripId]);

  const reloadContext = useCallback(async () => {
    if (!tripId || !enabled) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: executionSlipKeys.snapshot(tripId) }),
      queryClient.invalidateQueries({ queryKey: executionSlipKeys.itinerary(tripId) }),
    ]);
  }, [enabled, queryClient, tripId]);

  const openDecision = useCallback((problemId: string) => {
    setDecisionProblemId(problemId);
  }, []);

  const closeDecision = useCallback(() => {
    setDecisionProblemId(null);
  }, []);

  const submitDepartureSlip = useCallback(
    async (input: { delayMinutes: number; stillAtPoi: boolean }) => {
      if (!tripId || !currentActivityId) {
        throw new Error('当前活动不可用');
      }
      const plannedDepartAt = resolvePlannedDepartAt(currentActivityId, currentActivityItem);
      if (!plannedDepartAt) {
        throw new Error('无法解析计划离开时间');
      }

      setSubmittingSlip(true);
      try {
        const body = buildDepartureSlipRequest({
          activityId: currentActivityId,
          plannedDepartAt,
          delayMinutes: input.delayMinutes,
          stillAtPoi: input.stillAtPoi,
          tripDayDate: options?.tripDayDate,
        });
        const idempotencyKey =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        const response = await mobileExecutionApi.postDepartureSlip(tripId, body, idempotencyKey);

        if (response.status === 'NO_ACTION') {
          toast.message('按当前延误，后续行程仍可执行，无需调整');
          return response;
        }

        toast.success('后续行程可能赶不上，请查看调整建议');
        openDecision(response.problemId);
        return response;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '上报失败，请稍后重试');
        throw err;
      } finally {
        setSubmittingSlip(false);
      }
    },
    [currentActivityId, currentActivityItem, openDecision, options?.tripDayDate, tripId],
  );

  const acceptScheduleDecision = useCallback(
    async (input: { selectedOptionId?: string | null; acknowledgements: string[] }) => {
      if (!tripId || !decisionProblemId || !decisionQuery.data) return;
      const required = decisionQuery.data.requiredAcknowledgements ?? [];
      if (!areDecisionAcknowledgementsComplete(required, input.acknowledgements)) {
        toast.error('请先勾选全部确认项');
        return;
      }

      const actionId = resolveSelectedRepairOptionId(decisionQuery.data, input.selectedOptionId);
      if (!actionId) {
        toast.error('请选择调整方案');
        return;
      }

      setApplyingDecision(true);
      try {
        await mobileExecutionApi.acceptRecommendedDecision(tripId, decisionProblemId, {
          actionId,
          acknowledgement: required.length ? input.acknowledgements : undefined,
        });
        toast.success('方案已确认');
        closeDecision();
        const refreshed = await mobileExecutionApi.refreshExecutionSurface(tripId, {
          refreshExecutability: true,
        });
        queryClient.setQueryData(executionOverviewKeys.full(tripId), refreshed.overview);
        queryClient.setQueryData(executionTepKeys.alerts(tripId), refreshed.alerts);
        queryClient.setQueryData(executionTepKeys.queue(tripId), refreshed.queue);
        await invalidateSurface();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '确认失败');
        throw err;
      } finally {
        setApplyingDecision(false);
      }
    },
    [
      closeDecision,
      decisionProblemId,
      decisionQuery.data,
      invalidateSurface,
      queryClient,
      tripId,
    ],
  );

  return {
    snapshot,
    itinerary,
    canReportSlip,
    currentActivityId,
    loading: snapshotQuery.isLoading || itineraryQuery.isLoading,
    submittingSlip,
    decision: decisionQuery.data ?? null,
    decisionLoading: decisionQuery.isLoading,
    decisionProblemId,
    applyingDecision,
    openDecision,
    closeDecision,
    submitDepartureSlip,
    acceptScheduleDecision,
    reloadContext,
  };
}
