/**
 * Identity Governance Admin API
 * @see docs/api/project-fit-api.md § R2 声誉争议 Admin
 */

import apiClient from './client';
import { isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import { unwrapApiData } from '@/lib/api-response';
import { buildMockPendingReputationDisputes } from '@/lib/reputation-disputes-mock';
import type {
  ReputationDispute,
  ResolveReputationDisputeRequest,
} from '@/types/identity-governance';

const BASE = '/admin/identity/reputation';

function devFallback<T>(error: unknown, fallback: () => T): T {
  if (import.meta.env.DEV && (isIdentityApiNotReady(error) || isApiNotReadyError(error))) {
    return fallback();
  }
  throw error;
}

async function getWithMock<T>(
  path: string,
  params: Record<string, unknown> | undefined,
  mock: () => T
): Promise<T> {
  try {
    const response = await apiClient.get(path, params ? { params } : undefined);
    return unwrapApiData<T>(response.data);
  } catch (error) {
    return devFallback(error, mock);
  }
}

async function postWithMock<T>(
  path: string,
  body: unknown | undefined,
  mock: () => T
): Promise<T> {
  try {
    const response = await apiClient.post(path, body ?? {});
    return unwrapApiData<T>(response.data);
  } catch (error) {
    return devFallback(error, mock);
  }
}

export const identityGovernanceAdminApi = {
  listPendingReputationDisputes: (limit = 50): Promise<ReputationDispute[]> =>
    getWithMock<ReputationDispute[]>(`${BASE}/disputes/pending`, { limit }, () =>
      buildMockPendingReputationDisputes()
    ),

  startReputationDisputeReview: (disputeId: string): Promise<ReputationDispute> =>
    postWithMock(`${BASE}/disputes/${disputeId}/start-review`, {}, () => {
      const d = buildMockPendingReputationDisputes().find((x) => x.id === disputeId);
      return { ...(d ?? buildMockPendingReputationDisputes()[0]), status: 'UNDER_REVIEW' };
    }),

  resolveReputationDispute: (
    disputeId: string,
    body: ResolveReputationDisputeRequest
  ): Promise<ReputationDispute> =>
    postWithMock(`${BASE}/disputes/${disputeId}/resolve`, body, () => {
      const d = buildMockPendingReputationDisputes().find((x) => x.id === disputeId);
      return {
        ...(d ?? buildMockPendingReputationDisputes()[0]),
        status: body.status,
        resolution: body.resolution,
        resolvedAt: new Date().toISOString(),
      };
    }),
};
