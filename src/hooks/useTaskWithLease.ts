import { useCallback, useEffect, useRef, useState } from 'react';
import { agentApi, type RouteRunAsyncTaskStatusResponse } from '@/api/agent';
import { CONFIG } from '@/constants/config';
import {
  isTaskLeaseExhausted,
  resolveTaskLeasePollIntervalMs,
} from '@/lib/task-lease-ui';
import { RouteRunTaskLeaseExhaustedError } from '@/lib/route-run-task-lease-errors';
import { isRouteRunAsyncTerminalStatus } from '@/lib/route-run-async';

export function useTaskWithLease(taskId: string | null) {
  const [status, setStatus] = useState<RouteRunAsyncTaskStatusResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const pollOnce = useCallback(async (id: string) => {
    return agentApi.getRouteRunTaskStatus(id);
  }, []);

  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      setError(null);
      return;
    }

    cancelledRef.current = false;
    setError(null);

    const tick = async () => {
      try {
        const snap = await pollOnce(taskId);
        if (cancelledRef.current) return;

        setStatus(snap);

        if (isRouteRunAsyncTerminalStatus(snap.status)) return;
        if (isTaskLeaseExhausted(snap.task_lease_v1)) {
          setError(new RouteRunTaskLeaseExhaustedError(snap.message));
          return;
        }

        const interval = resolveTaskLeasePollIntervalMs(
          snap.task_lease_v1?.lease_status,
          CONFIG.API.ROUTE_RUN_ASYNC_POLL_INTERVAL_MS
        );
        window.setTimeout(() => void tick(), interval);
      } catch (err) {
        if (cancelledRef.current) return;
        setError(err instanceof Error ? err : new Error('任务状态读取失败'));
      }
    };

    void tick();

    return () => {
      cancelledRef.current = true;
    };
  }, [taskId, pollOnce]);

  return { status, error };
}
