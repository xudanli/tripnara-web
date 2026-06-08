import apiClient from './client';
import type { ActiveTripDashboard, TripDecisionEventRequest } from '@/types/active-trip-dashboard';
import {
  buildActiveTripDashboardMock,
  normalizeActiveTripDashboard,
} from '@/features/active-trip/lib/normalize-active-trip-dashboard';
import {
  getPendingRollbackProposal,
  resolveCurrentUserId,
  setPendingRollbackProposal,
} from '@/features/active-trip/lib/active-trip-context-store';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

function unwrap<T>(payload: SuccessResponse<T>): T {
  return payload.data;
}

async function liveGetActive(tripId: string): Promise<ActiveTripDashboard> {
  const response = await apiClient.get<SuccessResponse<unknown>>(`/trips/${tripId}/active`);
  const normalized = normalizeActiveTripDashboard(unwrap(response.data), tripId);
  if (!normalized) throw new Error('Active Trip Dashboard 数据无效');
  return normalized;
}

async function withMockFallback<T>(live: () => Promise<T>, mock: () => T | null): Promise<T> {
  try {
    return await live();
  } catch {
    const fallback = mock();
    if (!fallback) throw new Error('Active Trip Dashboard 不可用');
    return fallback;
  }
}

/** §3.12 · GET /api/trips/:tripId/active */
export const activeTripApi = {
  getDashboard: (tripId: string) =>
    withMockFallback(
      () => liveGetActive(tripId),
      () => buildActiveTripDashboardMock(tripId)
    ),

  postDecisionEvent: (tripId: string, body: TripDecisionEventRequest) =>
    withMockFallback(
      async () => {
        const response = await apiClient.post<SuccessResponse<unknown>>(
          `/trips/${tripId}/decision-events`,
          body
        );
        const normalized = normalizeActiveTripDashboard(unwrap(response.data), tripId);
        if (!normalized) throw new Error('决策事件响应无效');
        return normalized;
      },
      () => mockPostDecisionEvent(tripId, body)
    ),
};

function mockPostDecisionEvent(
  tripId: string,
  body: TripDecisionEventRequest
): ActiveTripDashboard {
  const userId = resolveCurrentUserId();

  if ('type' in body && body.type === 'route_rollback') {
    if (body.action === 'propose') {
      setPendingRollbackProposal(tripId, {
        proposalId: `rollback-${Date.now().toString(36)}`,
        proposedByUserId: userId,
        reasonZh: body.reasonZh ?? body.planBRef,
        status: 'pending_member_confirm',
        createdAt: new Date().toISOString(),
      });
    } else if (body.action === 'confirm') {
      const current = getPendingRollbackProposal(tripId);
      if (current) setPendingRollbackProposal(tripId, { ...current, status: 'approved' });
    } else if (body.action === 'protest') {
      const current = getPendingRollbackProposal(tripId);
      if (current) setPendingRollbackProposal(tripId, { ...current, status: 'rejected' });
    }
  } else if ('action' in body && body.action === 'propose_rollback') {
    setPendingRollbackProposal(tripId, {
      proposalId: `rollback-${Date.now().toString(36)}`,
      proposedByUserId: userId,
      reasonZh: body.reasonZh,
      status: 'pending_member_confirm',
      createdAt: new Date().toISOString(),
    });
  } else if ('action' in body && body.action === 'confirm_rollback') {
    const current = getPendingRollbackProposal(tripId);
    if (current?.proposalId === body.proposalId) {
      setPendingRollbackProposal(tripId, { ...current, status: 'approved' });
    }
  } else if ('action' in body && body.action === 'reject_rollback') {
    const current = getPendingRollbackProposal(tripId);
    if (current?.proposalId === body.proposalId) {
      setPendingRollbackProposal(tripId, { ...current, status: 'rejected' });
    }
  }

  const dashboard = buildActiveTripDashboardMock(tripId);
  if (!dashboard) throw new Error('Active Trip Dashboard 不可用');
  return dashboard;
}
