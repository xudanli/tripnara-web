import { useCallback, useEffect, useRef } from 'react';
import {
  type RouteAndRunResponse,
  type RouteRunAsyncTaskStatusResponse,
} from '@/api/agent';
import { normalizeAgentTaskPollPath } from '@/lib/route-run-task-path';
import { awaitRouteAndRunTaskCompletion } from '@/lib/route-run-task-sse';
import { syncPlanningTaskFromPollSnapshot, markPlanningTaskProcessing } from '@/lib/sync-planning-task-store';
import { usePlanningTaskStore } from '@/store/planningTaskStore';

export type StartTrackingOptions = {
  onProgress?: (snap: RouteRunAsyncTaskStatusResponse) => void;
  onTerminal?: (result: RouteAndRunResponse | null, failed: boolean) => void;
};

export function useRouteAndRunTask() {
  const store = usePlanningTaskStore();
  const abortRef = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const startTracking = useCallback(
    (taskId: string, pollPath?: string, options?: StartTrackingOptions) => {
      stopPolling();
      const normalized = normalizeAgentTaskPollPath(pollPath, taskId);
      markPlanningTaskProcessing(taskId, normalized);

      const ac = new AbortController();
      abortRef.current = ac;

      void (async () => {
        try {
          const data = await awaitRouteAndRunTaskCompletion(taskId, {
            signal: ac.signal,
            pollPath: normalized,
            onProgress: (snap) => {
              syncPlanningTaskFromPollSnapshot(snap);
              options?.onProgress?.(snap);
            },
          });
          if (!ac.signal.aborted) {
            options?.onTerminal?.(data, false);
          }
        } catch (e) {
          if (ac.signal.aborted) return;
          console.error('[useRouteAndRunTask] SSE/poll failed', e);
          options?.onTerminal?.(null, true);
        }
      })();
    },
    [stopPolling]
  );

  const waitForCompletion = useCallback(
    (taskId: string, pollPath?: string): Promise<RouteAndRunResponse> => {
      return new Promise((resolve, reject) => {
        startTracking(taskId, pollPath, {
          onTerminal: (result, failed) => {
            if (failed || !result) {
              const msg = usePlanningTaskStore.getState().message;
              reject(new Error(msg?.trim() || '行程规划失败'));
              return;
            }
            resolve(result);
          },
        });
      });
    },
    [startTracking]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    startTracking,
    stopPolling,
    waitForCompletion,
    ...store,
  };
}
