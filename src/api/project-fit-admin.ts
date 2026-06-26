/**
 * Project Fit Admin API
 * @see docs/api/project-fit-api.md § Admin
 */

import apiClient from './client';
import { isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import { unwrapApiData } from '@/lib/api-response';
import { buildMockPendingAppeals } from '@/lib/project-fit-mock';
import type {
  ProjectFitAppeal,
  ProjectFitAppealStatus,
  ResolveProjectFitAppealRequest,
  TriageProjectFitAppealRequest,
} from '@/types/project-fit';

const BASE = '/admin/identity/project-fit';

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

export const projectFitAdminApi = {
  listPendingAppeals: (
    statuses?: ProjectFitAppealStatus[],
    limit = 50
  ): Promise<ProjectFitAppeal[]> =>
    getWithMock<ProjectFitAppeal[]>(
      `${BASE}/appeals/pending`,
      { status: statuses?.join(',') ?? 'SUBMITTED,TRIAGED', limit },
      () => {
        const allowed = new Set(statuses ?? ['SUBMITTED', 'TRIAGED']);
        return buildMockPendingAppeals().filter((a) =>
          allowed.has(a.status as ProjectFitAppealStatus)
        );
      }
    ),

  triageAppeal: (appealId: string, body?: TriageProjectFitAppealRequest): Promise<ProjectFitAppeal> =>
    postWithMock(`${BASE}/appeals/${appealId}/triage`, body ?? {}, () => {
      const appeal = buildMockPendingAppeals().find((a) => a.id === appealId);
      return { ...(appeal ?? buildMockPendingAppeals()[0]), status: 'TRIAGED' };
    }),

  startAppealReview: (appealId: string): Promise<ProjectFitAppeal> =>
    postWithMock(`${BASE}/appeals/${appealId}/start-review`, {}, () => {
      const appeal = buildMockPendingAppeals().find((a) => a.id === appealId);
      return { ...(appeal ?? buildMockPendingAppeals()[0]), status: 'UNDER_REVIEW' };
    }),

  resolveAppeal: (appealId: string, body: ResolveProjectFitAppealRequest): Promise<ProjectFitAppeal> =>
    postWithMock(`${BASE}/appeals/${appealId}/resolve`, body, () => {
      const appeal = buildMockPendingAppeals().find((a) => a.id === appealId);
      const overturnEffects =
        body.status === 'UPHELD' || body.status === 'PARTIALLY_UPHELD'
          ? {
              reopenedApplicationIds: ['pfa-demo-1'],
              resetAssessmentIds: ['fit-local-demo'],
            }
          : undefined;
      return {
        ...(appeal ?? buildMockPendingAppeals()[0]),
        status: body.status,
        resolution: body.resolution,
        overturnEffects,
        resolvedAt: new Date().toISOString(),
      };
    }),

  expireOutdatedAssessments: (): Promise<{ expiredCount: number }> =>
    postWithMock(`${BASE}/assessments/expire-outdated`, {}, () => ({ expiredCount: 0 })),
};
