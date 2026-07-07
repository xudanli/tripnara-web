import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProposalMonitor } from '@/dto/frontend-arrange-itinerary-api-client';

export const proposalMonitorKeys = {
  all: ['proposal-monitor'] as const,
  trip: (tripId: string, proposalId: string) =>
    [...proposalMonitorKeys.all, tripId, proposalId] as const,
};

export interface UseProposalMonitorPollingOptions {
  enabled?: boolean;
  intervalMs?: number;
  /** monitor 返回 isStale 时回调（例如重新打开决策 sheet） */
  onStale?: () => void;
}

/**
 * apply 完成后轮询 fetchProposalMonitor，直到 isStale。
 */
export function useProposalMonitorPolling(
  tripId: string,
  proposalId: string | null | undefined,
  options: UseProposalMonitorPollingOptions = {},
) {
  const { enabled = true, intervalMs = 15_000, onStale } = options;
  const onStaleRef = useRef(onStale);
  onStaleRef.current = onStale;
  const staleNotifiedRef = useRef(false);

  const query = useQuery({
    queryKey: proposalMonitorKeys.trip(tripId, proposalId ?? ''),
    queryFn: () => fetchProposalMonitor(tripId, proposalId!),
    enabled: Boolean(tripId && proposalId && enabled),
    refetchInterval: (q) => (q.state.data?.isStale ? false : intervalMs),
  });

  useEffect(() => {
    staleNotifiedRef.current = false;
  }, [proposalId]);

  useEffect(() => {
    if (!query.data?.isStale || staleNotifiedRef.current) return;
    staleNotifiedRef.current = true;
    onStaleRef.current?.();
  }, [query.data?.isStale]);

  return {
    monitor: query.data,
    monitorLoading: query.isLoading,
    isStale: query.data?.isStale ?? false,
    staleReason: query.data?.staleReason,
  };
}
