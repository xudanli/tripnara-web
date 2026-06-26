/**
 * Trusted Projects API
 * Base: /trusted-projects/*
 * @see docs/api/identity-governance-api.md §6
 */

import apiClient from './client';
import { isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import { unwrapApiData } from '@/lib/api-response';
import {
  normalizeTrustedProjectDetailResponse,
  normalizeTrustedProjectListResponse,
} from '@/lib/normalize-trusted-projects';
import {
  buildMockTrustedProjectListings,
  getMockTrustedProjectById,
} from '@/lib/trusted-projects-mock';
import {
  buildMockEligibilityRules,
  buildMockFitAssessment,
  buildMockFitAssessmentStatus,
  buildMockFitConfig,
  buildMockFitQuestionnaire,
  buildMockProjectFitApplication,
  buildMockReviewQueue,
  updateMockFitConfig,
} from '@/lib/project-fit-mock';
import { normalizeFitQuestionnaire } from '@/lib/normalize-fit-questionnaire';
import type {
  CreateEligibilityRuleRequest,
  EligibilityRule,
  FitAssessment,
  FitAssessmentStatusResponse,
  FitConfig,
  FitQuestionnairePhase,
  FitQuestionnaireResponse,
  FitApplicationReviewQueueResponse,
  ProjectFitApplication,
  SubmitApplicationWithFitRequest,
  UpdateFitConfigRequest,
} from '@/types/project-fit';
import type {
  CreateTrustedProjectRequest,
  ReviewTrustedProjectApplicationRequest,
  TrustedProjectApplication,
  TrustedProjectListQuery,
  TrustedProjectListing,
} from '@/types/trusted-projects';

const BASE = '/trusted-projects';

function devFallback<T>(error: unknown, fallback: () => T): T {
  if (import.meta.env.DEV && (isIdentityApiNotReady(error) || isApiNotReadyError(error))) {
    return fallback();
  }
  throw error;
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get(path, params ? { params } : undefined);
  return unwrapApiData<T>(response.data);
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiClient.post(path, body ?? {});
  return unwrapApiData<T>(response.data);
}

export const trustedProjectsApi = {
  list: async (query?: TrustedProjectListQuery): Promise<TrustedProjectListing[]> => {
    try {
      const raw = await get<unknown>(BASE, query as Record<string, unknown> | undefined);
      return normalizeTrustedProjectListResponse(raw);
    } catch (error) {
      return devFallback(error, () => buildMockTrustedProjectListings(query));
    }
  },

  getById: async (id: string): Promise<TrustedProjectListing> => {
    try {
      const raw = await get<unknown>(`${BASE}/${id}`);
      const listing = normalizeTrustedProjectDetailResponse(raw);
      if (!listing) throw new Error('项目不存在');
      return listing;
    } catch (error) {
      return devFallback(error, () => {
        const mock = getMockTrustedProjectById(id);
        if (!mock) throw error;
        return mock;
      });
    }
  },

  listMine: async (): Promise<TrustedProjectListing[]> => {
    try {
      const raw = await get<unknown>(`${BASE}/mine/list`);
      return normalizeTrustedProjectListResponse(raw);
    } catch (error) {
      return devFallback(error, () => []);
    }
  },

  create: async (body: CreateTrustedProjectRequest): Promise<TrustedProjectListing> => {
    try {
      return await post<TrustedProjectListing>(BASE, body);
    } catch (error) {
      return devFallback(error, () => ({
        id: `local-tp-${Date.now()}`,
        ...body,
        listingStatus: 'draft',
        slotsRemaining: body.slotsTotal,
      }));
    }
  },

  submit: (id: string): Promise<TrustedProjectListing> =>
    post<TrustedProjectListing>(`${BASE}/${id}/submit`),

  linkTrip: async (listingId: string, tripId: string): Promise<TrustedProjectListing> => {
    try {
      const raw = await post<unknown>(`${BASE}/${listingId}/link-trip`, { tripId });
      const listing = normalizeTrustedProjectDetailResponse(raw);
      if (!listing) throw new Error('关联行程失败');
      return listing;
    } catch (error) {
      return devFallback(error, () => ({
        ...(getMockTrustedProjectById(listingId) ?? {
          id: listingId,
          title: '本地项目',
          destination: 'IS',
          startDate: '2026-08-01',
          endDate: '2026-08-08',
          commercialType: 'NON_COMMERCIAL' as const,
          slotsTotal: 1,
          listingStatus: 'draft' as const,
        }),
        tripId,
      }));
    }
  },

  apply: (id: string, message?: string): Promise<TrustedProjectApplication> =>
    post<TrustedProjectApplication>(`${BASE}/${id}/applications`, message ? { message } : {}),

  listApplications: (id: string): Promise<TrustedProjectApplication[]> =>
    get<TrustedProjectApplication[]>(`${BASE}/${id}/applications`),

  reviewApplication: (
    listingId: string,
    applicationId: string,
    body: ReviewTrustedProjectApplicationRequest
  ): Promise<TrustedProjectApplication> =>
    post<TrustedProjectApplication>(
      `${BASE}/${listingId}/applications/${applicationId}/review`,
      body
    ),

  close: (id: string): Promise<TrustedProjectListing> =>
    post<TrustedProjectListing>(`${BASE}/${id}/close`),

  withdraw: (id: string): Promise<unknown> => post(`${BASE}/${id}/withdraw`),

  // ── Project Fit · 准入规则 ───────────────────────────────
  getEligibilityRules: async (listingId: string): Promise<EligibilityRule[]> => {
    try {
      return await get<EligibilityRule[]>(`${BASE}/${listingId}/eligibility-rules`);
    } catch (error) {
      return devFallback(error, () => buildMockEligibilityRules(listingId));
    }
  },

  createEligibilityRule: (
    listingId: string,
    body: CreateEligibilityRuleRequest
  ): Promise<EligibilityRule> =>
    post<EligibilityRule>(`${BASE}/${listingId}/eligibility-rules`, body),

  seedDefaultEligibilityRules: (listingId: string): Promise<EligibilityRule[]> =>
    post<EligibilityRule[]>(`${BASE}/${listingId}/eligibility-rules/seed-defaults`),

  // ── Project Fit · 适合度评估 ─────────────────────────────
  startFitAssessment: async (listingId: string): Promise<FitAssessment> => {
    try {
      return await post<FitAssessment>(`${BASE}/${listingId}/fit-assessments`);
    } catch (error) {
      return devFallback(error, () => buildMockFitAssessment(listingId));
    }
  },

  submitApplicationWithFit: async (
    listingId: string,
    body: SubmitApplicationWithFitRequest
  ): Promise<ProjectFitApplication> => {
    try {
      return await post<ProjectFitApplication>(
        `${BASE}/${listingId}/applications/with-fit`,
        body
      );
    } catch (error) {
      return devFallback(error, () =>
        buildMockProjectFitApplication(listingId, body.fitAssessmentId)
      );
    }
  },

  getFitQuestionnaire: async (
    listingId: string,
    phase: FitQuestionnairePhase = 'full'
  ): Promise<FitQuestionnaireResponse> => {
    try {
      const raw = await get<unknown>(`${BASE}/${listingId}/fit-questionnaire`, { phase });
      const r = raw as Record<string, unknown>;
      return {
        phase,
        ruleVersion:
          typeof r.ruleVersion === 'number'
            ? r.ruleVersion
            : typeof r.ruleSnapshotVersion === 'number'
              ? r.ruleSnapshotVersion
              : undefined,
        questions: normalizeFitQuestionnaire(raw),
      };
    } catch (error) {
      return devFallback(error, () => buildMockFitQuestionnaire(phase));
    }
  },

  getFitConfig: async (listingId: string): Promise<FitConfig> => {
    try {
      return await get<FitConfig>(`${BASE}/${listingId}/fit-config`);
    } catch (error) {
      return devFallback(error, () => buildMockFitConfig(listingId));
    }
  },

  updateFitConfig: async (listingId: string, body: UpdateFitConfigRequest): Promise<FitConfig> => {
    try {
      return await post<FitConfig>(`${BASE}/${listingId}/fit-config`, body);
    } catch (error) {
      return devFallback(error, () => updateMockFitConfig(listingId, body));
    }
  },

  getFitAssessmentStatus: async (listingId: string): Promise<FitAssessmentStatusResponse> => {
    try {
      return await get<FitAssessmentStatusResponse>(`${BASE}/${listingId}/fit-assessment-status`);
    } catch (error) {
      return devFallback(error, () => buildMockFitAssessmentStatus(listingId, false));
    }
  },

  getApplicationReviewQueue: async (
    listingId: string
  ): Promise<FitApplicationReviewQueueResponse> => {
    try {
      return await get<FitApplicationReviewQueueResponse>(
        `${BASE}/${listingId}/applications/review-queue`
      );
    } catch (error) {
      return devFallback(error, () => buildMockReviewQueue());
    }
  },
};
