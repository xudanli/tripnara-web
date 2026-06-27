import type { RouteAndRunResponse, RouteRunAsyncTaskStatusResponse } from '@/api/agent';
import { syncRelaxationSuggestionsFromRouteRun } from '@/lib/sync-relaxation-suggestions-store';
import { applyRouteAndRunToStore } from '@/lib/world-model-guards';
import { applyRouteRunConfirmationToStore } from '@/lib/route-run-confirmation';
import { applyRouteRunNegotiationToStore } from '@/lib/route-run-negotiation';
import type { PlanningTaskStatus } from '@/store/planningTaskStore';
import { usePlanningTaskStore } from '@/store/planningTaskStore';

function mapTaskStatus(status: string | undefined): PlanningTaskStatus {
  if (status === 'SUCCESS') return 'SUCCESS';
  if (status === 'FAILED' || status === 'CANCELLED') return 'FAILED';
  if (status === 'PENDING' || status === 'PROCESSING') return 'PROCESSING';
  return 'PROCESSING';
}

export function syncPlanningTaskFromPollSnapshot(snap: RouteRunAsyncTaskStatusResponse): void {
  const resultData =
    snap.status === 'SUCCESS' && snap.data
      ? (snap.data as RouteAndRunResponse)
      : snap.status === 'SUCCESS'
        ? usePlanningTaskStore.getState().resultData
        : null;

  if (snap.status === 'SUCCESS' && resultData?.result?.status === 'OK') {
    applyRouteAndRunToStore(resultData);
  } else if (snap.status === 'SUCCESS' && resultData?.result?.status === 'NEED_CONFIRMATION') {
    applyRouteRunConfirmationToStore(resultData);
  } else if (
    snap.status === 'SUCCESS' &&
    resultData?.result?.payload?.negotiation_payload?.status === 'PENDING_USER_DECISION'
  ) {
    applyRouteRunNegotiationToStore(resultData);
  }

  usePlanningTaskStore.getState().setTask({
    taskId: snap.task_id,
    currentPhase: snap.current_phase ?? '',
    progressPercentage: snap.progress_percentage ?? 0,
    message: snap.message ?? '',
    status: mapTaskStatus(snap.status),
    resultData,
    taskLease: snap.task_lease_v1 ?? null,
  });

  if (resultData) {
    syncRelaxationSuggestionsFromRouteRun(resultData);
  }
}

export function markPlanningTaskProcessing(taskId: string, pollPath: string): void {
  usePlanningTaskStore.getState().setTask({
    taskId,
    pollPath,
    status: 'PROCESSING',
    progressPercentage: 5,
    message: '规划师已接收需求…',
    currentPhase: 'INTAKE',
    resultData: null,
  });
}
