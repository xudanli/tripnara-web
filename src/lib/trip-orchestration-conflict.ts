import { toast } from 'sonner';
import { syncTripDataAfterAgentMutation } from '@/lib/agent-trip-sync';
import { queryClient } from '@/lib/query-client';
import { useTripDsoVersionStore } from '@/store/tripDsoVersionStore';

export const TRIP_ORCHESTRATION_BUSY_CODE = 'TRIP_ORCHESTRATION_BUSY';
export const STALE_PLAN_VERSION_CODE = 'STALE_PLAN_VERSION';

export type TripOrchestrationConflictBody = {
  code?: string;
  message?: string;
  trip_id?: string;
  client_dso_version?: string;
  server_dso_version?: string;
};

export function parseTripOrchestrationConflictBody(data: unknown): TripOrchestrationConflictBody | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as TripOrchestrationConflictBody;
  if (typeof d.code !== 'string') return null;
  return d;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function computeBusyRetryDelayMs(attemptIndex: number): number {
  const n = Math.max(0, attemptIndex);
  return 2 ** n * 200 + Math.random() * 100;
}

let staleDialogInFlight = false;

async function showStalePlanVersionDialog(message?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (staleDialogInFlight) return;
  staleDialogInFlight = true;
  try {
    const text =
      message?.trim() ||
      '行程已在其他窗口或操作中更新。确认后将刷新为最新版本，请再试一次保存或修改。';
    window.alert(text);
  } finally {
    staleDialogInFlight = false;
  }
}

/**
 * STALE_PLAN_VERSION：刷新行程相关缓存、写入服务端版本，不打断全局导航。
 */
export async function handleStalePlanVersionConflict(
  body: TripOrchestrationConflictBody
): Promise<void> {
  const tripId = body.trip_id?.trim();
  if (body.server_dso_version?.trim() && tripId) {
    useTripDsoVersionStore.getState().setServerDsoVersion(tripId, body.server_dso_version);
  }

  await showStalePlanVersionDialog(body.message);
  if (tripId) {
    await syncTripDataAfterAgentMutation(queryClient, tripId, 'stale_plan_version');
  } else {
    await syncTripDataAfterAgentMutation(queryClient, undefined, 'stale_plan_version');
  }
}

export function toastTripOrchestrationBusyExhausted(): void {
  toast.error('行程保存繁忙，请稍后再试');
}

export function toastTripOrchestrationBusyWaiting(): void {
  toast.info('行程保存中，请稍候…', { id: 'trip-orchestration-busy', duration: 2500 });
}
