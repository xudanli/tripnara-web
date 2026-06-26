import apiClient from './client';
import type {
  RouteContractAuthorizeRequest,
  RouteContractReorderRequest,
  TemplateBackflowPreview,
  TemplateBackflowCommitRequest,
  TemplateBackflowCommitResponse,
} from '@/types/active-trip-decision-replay';
import type { ActiveTripDashboard } from '@/types/active-trip-dashboard';
import {
  authorizeVaultMilestones,
  setVaultMilestoneOrder,
} from '@/features/active-trip/lib/vault-authorization-store';
import { buildActiveTripDashboardMock } from '@/features/active-trip/lib/normalize-active-trip-dashboard';
import {
  buildDecisionReplayMock,
  buildTemplateBackflowPreviewMock,
} from '@/features/active-trip/lib/decision-replay-mock';
import { normalizeDecisionReplay } from '@/features/active-trip/lib/normalize-decision-replay';
import {
  getTemplateBackflowCommitted,
  setTemplateBackflowCommitted,
} from '@/features/active-trip/lib/active-trip-context-store';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

function unwrap<T>(payload: SuccessResponse<T>): T {
  return payload.data;
}

async function withMockFallback<T>(live: () => Promise<T>, mock: () => T): Promise<T> {
  try {
    return await live();
  } catch {
    return mock();
  }
}

function mockAuthorizeVault(
  tripId: string,
  body: RouteContractAuthorizeRequest
): ActiveTripDashboard {
  const dashboard = buildActiveTripDashboardMock(tripId);
  if (!dashboard?.routeContractLock) {
    throw new Error('Route Contract Lock 不可用');
  }

  const pending = dashboard.routeContractLock.milestones
    .filter((m) => m.vaultStatus === 'pending_vault')
    .map((m) => m.id);

  const toAuthorize = body.milestoneId ? [body.milestoneId] : pending;
  authorizeVaultMilestones(tripId, toAuthorize);

  const refreshed = buildActiveTripDashboardMock(tripId);
  if (!refreshed) throw new Error('Dashboard 不可用');
  return refreshed;
}

function mockReorderVault(tripId: string, body: RouteContractReorderRequest): ActiveTripDashboard {
  const dashboard = buildActiveTripDashboardMock(tripId);
  if (!dashboard?.routeContractLock?.canCaptainRollbackMilestoneOrder) {
    throw new Error('队长无权调整里程碑顺序');
  }
  setVaultMilestoneOrder(tripId, body.milestoneIds);

  const refreshed = buildActiveTripDashboardMock(tripId);
  if (!refreshed) throw new Error('Dashboard 不可用');
  return refreshed;
}

function mockCommitTemplateBackflow(
  tripId: string,
  body: TemplateBackflowCommitRequest
): TemplateBackflowCommitResponse {
  if (getTemplateBackflowCommitted(tripId) && body.skipIfExists !== false) {
    return { alreadyCommitted: true };
  }
  const preview = buildTemplateBackflowPreviewMock(tripId);
  if (!preview.canBackflow) {
    throw new Error('FORBIDDEN');
  }
  setTemplateBackflowCommitted(tripId, preview.suggestedCatalogId);
  return { alreadyCommitted: false, catalogId: preview.suggestedCatalogId };
}

/** § Phase 3 · Route Contract Lock 子 API */
export const routeContractLockApi = {
  authorize: (tripId: string, body: RouteContractAuthorizeRequest = {}) =>
    withMockFallback(
      async () => {
        const response = await apiClient.post<SuccessResponse<unknown>>(
          `/trips/${tripId}/route-contract-lock/authorize`,
          body
        );
        const data = unwrap(response.data);
        if (data && typeof data === 'object' && 'version' in (data as object)) {
          return data as ActiveTripDashboard;
        }
        return mockAuthorizeVault(tripId, body);
      },
      () => mockAuthorizeVault(tripId, body)
    ),

  reorder: (tripId: string, body: RouteContractReorderRequest) =>
    withMockFallback(
      async () => {
        const response = await apiClient.post<SuccessResponse<unknown>>(
          `/trips/${tripId}/route-contract-lock/reorder`,
          body
        );
        const data = unwrap(response.data);
        if (data && typeof data === 'object' && 'version' in (data as object)) {
          return data as ActiveTripDashboard;
        }
        return mockReorderVault(tripId, body);
      },
      () => mockReorderVault(tripId, body)
    ),
};

/** Decision Replay + Template Backflow */
export const activeTripSubResourceApi = {
  getDecisionReplay: (tripId: string) =>
    withMockFallback(
      async () => {
        const response = await apiClient.get<SuccessResponse<unknown>>(
          `/trips/${tripId}/decision-replay`
        );
        return normalizeDecisionReplay(unwrap(response.data), tripId);
      },
      () => buildDecisionReplayMock(tripId)
    ),

  getTemplateBackflowPreview: (tripId: string) =>
    withMockFallback(
      async () => {
        const response = await apiClient.get<SuccessResponse<TemplateBackflowPreview>>(
          `/trips/${tripId}/template-backflow/preview`
        );
        return unwrap(response.data);
      },
      () => buildTemplateBackflowPreviewMock(tripId)
    ),

  commitTemplateBackflow: (tripId: string, body: TemplateBackflowCommitRequest = {}) =>
    withMockFallback(
      async () => {
        const response = await apiClient.post<SuccessResponse<TemplateBackflowCommitResponse>>(
          `/trips/${tripId}/template-backflow/commit`,
          body
        );
        return unwrap(response.data);
      },
      () => mockCommitTemplateBackflow(tripId, body)
    ),
};
