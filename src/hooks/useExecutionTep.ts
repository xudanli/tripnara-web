import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mobileExecutionApi, MobileExecutionApiError } from '@/api/mobile-execution';
import { isTepIntervention, resolveDecisionAcceptRequest, resolveInterventionWriteBranch, resolveRiskIdForIntervention } from '@/lib/mobile-execution.util';
import type {
  ExecutionAdjustmentQueueDto,
  ExecutionAlertsDto,
  ExecutionInterventionDto,
  TepRepairAcceptRequest,
} from '@/types/mobile-execution';

export const executionTepKeys = {
  all: ['execution-tep'] as const,
  trip: (tripId: string) => [...executionTepKeys.all, tripId] as const,
  alerts: (tripId: string) => [...executionTepKeys.trip(tripId), 'alerts'] as const,
  queue: (tripId: string) => [...executionTepKeys.trip(tripId), 'queue'] as const,
};

export interface UseExecutionTepOptions {
  enabled?: boolean;
}

export interface UseExecutionTepResult {
  alerts: ExecutionAlertsDto | null;
  queue: ExecutionAdjustmentQueueDto | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  contextVersion: number | null;
  reload: () => Promise<void>;
  acceptIntervention: (item: ExecutionInterventionDto) => Promise<void>;
  deferIntervention: (item: ExecutionInterventionDto) => Promise<void>;
  applyingId: string | null;
}

export function useExecutionTep(
  tripId: string | null | undefined,
  options?: UseExecutionTepOptions,
): UseExecutionTepResult {
  const enabled = Boolean(tripId) && options?.enabled !== false;
  const queryClient = useQueryClient();
  const contextVersionRef = useRef<number | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const alertsQuery = useQuery({
    queryKey: executionTepKeys.alerts(tripId ?? ''),
    queryFn: () => mobileExecutionApi.getExecutionAlerts(tripId!),
    enabled,
    staleTime: 15_000,
  });

  const queueQuery = useQuery({
    queryKey: executionTepKeys.queue(tripId ?? ''),
    queryFn: () => mobileExecutionApi.getAdjustmentQueue(tripId!),
    enabled,
    staleTime: 15_000,
  });

  const alerts = alertsQuery.data ?? null;
  const queue = queueQuery.data ?? null;
  const contextVersion = queue?.contextVersion ?? alerts?.contextVersion ?? contextVersionRef.current;

  if (queue?.contextVersion != null) contextVersionRef.current = queue.contextVersion;
  else if (alerts?.contextVersion != null) contextVersionRef.current = alerts.contextVersion;

  const invalidateIfStale = useCallback(
    (nextVersion?: number) => {
      if (nextVersion != null && contextVersionRef.current != null && nextVersion <= contextVersionRef.current) {
        return;
      }
      if (tripId) {
        void queryClient.invalidateQueries({ queryKey: executionTepKeys.trip(tripId) });
      }
    },
    [queryClient, tripId],
  );

  const reload = useCallback(async () => {
    if (!tripId || !enabled) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: executionTepKeys.alerts(tripId) }),
        queryClient.invalidateQueries({ queryKey: executionTepKeys.queue(tripId) }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, queryClient, tripId]);

  const refreshAfterWrite = useCallback(async () => {
    if (!tripId) return;
    const result = await mobileExecutionApi.refreshAfterWrite(tripId, { refreshExecutability: true });
    queryClient.setQueryData(executionTepKeys.alerts(tripId), result.alerts);
    queryClient.setQueryData(executionTepKeys.queue(tripId), result.queue);
    contextVersionRef.current = result.queue.contextVersion;
  }, [queryClient, tripId]);

  const acceptIntervention = useCallback(
    async (item: ExecutionInterventionDto) => {
      if (!tripId) return;
      setApplyingId(item.id);
      try {
        const branch = resolveInterventionWriteBranch(item);

        if (branch === 'tep') {
          const body: TepRepairAcceptRequest = {
            basePlanVersionId: item.recommendation?.basePlanVersionId,
            comment: item.recommendation?.title,
          };
          const res = await mobileExecutionApi.acceptTepRepair(tripId, item.id, body);
          if (!res.result.idempotentReplay) {
            toast.success(res.previewSummary || '修复已应用');
          }
          invalidateIfStale(res.contextVersion);
          await refreshAfterWrite();
          return;
        }

        if (branch === 'slip') {
          throw new Error('行程调整建议须通过决策卡确认');
        }

        if (branch === 'decision' && item.decisionProblemId) {
          const detail = await mobileExecutionApi.getDecisionQueueItem(
            tripId,
            item.decisionProblemId,
          );
          await mobileExecutionApi.acceptDecision(
            tripId,
            item.decisionProblemId,
            resolveDecisionAcceptRequest(item, detail),
          );
          toast.success('调整已确认');
          await refreshAfterWrite();
          return;
        }

        const riskId = resolveRiskIdForIntervention(item);
        if (!riskId) {
          throw new Error('无法识别风险项');
        }
        const recs = await mobileExecutionApi.getRiskRecommendations(tripId, riskId);
        const rec = recs.items[0];
        if (!rec) {
          throw new Error('暂无可用方案');
        }
        await mobileExecutionApi.applyRiskRecommendation(tripId, riskId, rec.id);
        await mobileExecutionApi.confirmRiskRecommendation(tripId, riskId, rec.id);
        toast.success('方案已应用');
        await refreshAfterWrite();
      } catch (err) {
        if (err instanceof MobileExecutionApiError && err.code === 'STALE_REPAIR_OPTION') {
          toast.error('方案已过期，正在刷新…');
          await reload();
          return;
        }
        toast.error(err instanceof Error ? err.message : '操作失败');
        throw err;
      } finally {
        setApplyingId(null);
      }
    },
    [invalidateIfStale, reload, refreshAfterWrite, tripId],
  );

  const deferIntervention = useCallback(
    async (item: ExecutionInterventionDto) => {
      if (!tripId || !item.decisionProblemId) return;
      setApplyingId(item.id);
      try {
        await mobileExecutionApi.deferDecision(tripId, item.decisionProblemId);
        toast.message('已稍后处理');
        await refreshAfterWrite();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '延后失败');
      } finally {
        setApplyingId(null);
      }
    },
    [refreshAfterWrite, tripId],
  );

  const error =
    alertsQuery.error instanceof Error
      ? alertsQuery.error.message
      : queueQuery.error instanceof Error
        ? queueQuery.error.message
        : null;

  return {
    alerts,
    queue,
    loading: alertsQuery.isLoading || queueQuery.isLoading,
    refreshing: refreshing || alertsQuery.isFetching || queueQuery.isFetching,
    error,
    contextVersion,
    reload,
    acceptIntervention,
    deferIntervention,
    applyingId,
  };
}

export { isTepIntervention };
