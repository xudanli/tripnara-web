/**
 * Project Fit API
 * @see docs/api/project-fit-api.md
 */

import apiClient from './client';
import { isIdentityApiNotReady } from '@/api/identity-governance';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import { unwrapApiData } from '@/lib/api-response';
import {
  buildMockEligibilityRules,
  buildMockFitDocuments,
  buildMockFitReport,
  buildMockManagedApplications,
  buildMockMineApplications,
  buildMockProjectFitApplication,
  buildMockRuleTemplates,
} from '@/lib/project-fit-mock';
import type {
  ApplyRuleTemplateRequest,
  ApplyRuleTemplateResponse,
  ClarifyApplicationRequest,
  CreateRuleTemplateRequest,
  FitAssessment,
  FitAssessmentAnswer,
  FitAssessmentDocument,
  FitAssessmentReport,
  FitDocumentType,
  FitReportRole,
  LeaderApplicationDecisionRequest,
  ManagedApplicationsQuery,
  ManagedApplicationsResponse,
  MineApplicationsQuery,
  MineApplicationsResponse,
  ProjectFitAppeal,
  ProjectFitApplication,
  ProjectFitRuleTemplate,
  SubmitProjectFitAppealRequest,
  UploadFitDocumentBase64Request,
} from '@/types/project-fit';

const BASE = '/project-fit';

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

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch(path, body ?? {});
  return unwrapApiData<T>(response.data);
}

export const projectFitApi = {
  // ── 申请中心 R2 ─────────────────────────────────────────
  listMyApplications: async (query?: MineApplicationsQuery): Promise<MineApplicationsResponse> => {
    try {
      return await get<MineApplicationsResponse>(`${BASE}/applications/mine`, query as Record<string, unknown>);
    } catch (error) {
      return devFallback(error, () => buildMockMineApplications(query));
    }
  },

  listManagedApplications: async (
    query?: ManagedApplicationsQuery
  ): Promise<ManagedApplicationsResponse> => {
    try {
      return await get<ManagedApplicationsResponse>(
        `${BASE}/applications/managed`,
        query as Record<string, unknown>
      );
    } catch (error) {
      return devFallback(error, () => buildMockManagedApplications(query));
    }
  },

  // ── 规则模板 R2 ─────────────────────────────────────────
  listRuleTemplates: async (organizationId?: string): Promise<ProjectFitRuleTemplate[]> => {
    try {
      return await get<ProjectFitRuleTemplate[]>(`${BASE}/rule-templates`, {
        organizationId,
      });
    } catch (error) {
      return devFallback(error, () => buildMockRuleTemplates());
    }
  },

  createRuleTemplate: (body: CreateRuleTemplateRequest): Promise<ProjectFitRuleTemplate> =>
    post<ProjectFitRuleTemplate>(`${BASE}/rule-templates`, body),

  // ── 评估 ────────────────────────────────────────────────
  saveAssessmentAnswers: async (
    assessmentId: string,
    answers: FitAssessmentAnswer[]
  ): Promise<FitAssessment> => {
    try {
      return await patch<FitAssessment>(`${BASE}/assessments/${assessmentId}/answers`, {
        answers,
      });
    } catch (error) {
      return devFallback(error, () => ({
        id: assessmentId,
        listingId: '',
        status: 'IN_PROGRESS',
      }));
    }
  },

  evaluateAssessment: async (assessmentId: string): Promise<FitAssessment> => {
    try {
      return await post<FitAssessment>(`${BASE}/assessments/${assessmentId}/evaluate`);
    } catch (error) {
      return devFallback(error, () => {
        const report = buildMockFitReport();
        return {
          id: assessmentId,
          listingId: '',
          status: 'COMPLETED',
          overallResult: report.overallResult,
          overallResultLabel: report.overallResultLabel,
          completedAt: new Date().toISOString(),
        };
      });
    }
  },

  getAssessmentReport: async (
    assessmentId: string,
    role: FitReportRole = 'applicant'
  ): Promise<FitAssessmentReport> => {
    try {
      return await get<FitAssessmentReport>(`${BASE}/assessments/${assessmentId}/report`, {
        role,
      });
    } catch (error) {
      return devFallback(error, () => buildMockFitReport());
    }
  },

  // ── 证件 R2 ─────────────────────────────────────────────
  listAssessmentDocuments: async (assessmentId: string): Promise<FitAssessmentDocument[]> => {
    try {
      return await get<FitAssessmentDocument[]>(`${BASE}/assessments/${assessmentId}/documents`);
    } catch (error) {
      return devFallback(error, () => buildMockFitDocuments(assessmentId));
    }
  },

  uploadAssessmentDocument: async (
    assessmentId: string,
    file: File,
    documentType: FitDocumentType,
    opts?: { linkedQuestionKey?: string; locale?: string }
  ): Promise<FitAssessmentDocument> => {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    if (opts?.linkedQuestionKey) form.append('linkedQuestionKey', opts.linkedQuestionKey);
    if (opts?.locale) form.append('locale', opts.locale);

    try {
      const response = await apiClient.post(
        `${BASE}/assessments/${assessmentId}/documents`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return unwrapApiData<FitAssessmentDocument>(response.data);
    } catch (error) {
      return devFallback(error, () => ({
        id: `doc-local-${Date.now()}`,
        assessmentId,
        documentType,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        ocrStatus: 'COMPLETED',
        extractedFields: { documentNumber: '****1234' },
        createdAt: new Date().toISOString(),
      }));
    }
  },

  uploadAssessmentDocumentBase64: (
    assessmentId: string,
    body: UploadFitDocumentBase64Request
  ): Promise<FitAssessmentDocument> =>
    post<FitAssessmentDocument>(`${BASE}/assessments/${assessmentId}/documents/base64`, body),

  reRunDocumentOcr: async (documentId: string, locale = 'zh-CN'): Promise<FitAssessmentDocument> => {
    try {
      const response = await apiClient.post(
        `${BASE}/documents/${documentId}/re-run-ocr`,
        undefined,
        { params: { locale } }
      );
      return unwrapApiData<FitAssessmentDocument>(response.data);
    } catch (error) {
      return devFallback(error, () => ({
        id: documentId,
        assessmentId: '',
        documentType: 'PASSPORT',
        fileName: 'passport.jpg',
        ocrStatus: 'COMPLETED',
      }));
    }
  },

  // ── 申请 ────────────────────────────────────────────────
  getApplication: async (applicationId: string): Promise<ProjectFitApplication> => {
    try {
      return await get<ProjectFitApplication>(`${BASE}/applications/${applicationId}`);
    } catch (error) {
      return devFallback(error, () => ({
        id: applicationId,
        listingId: '',
        fitAssessmentId: '',
        applicantUserId: '',
        status: 'UNDER_REVIEW',
      }));
    }
  },

  submitLeaderDecision: async (
    applicationId: string,
    body: LeaderApplicationDecisionRequest
  ): Promise<ProjectFitApplication> => {
    try {
      return await post<ProjectFitApplication>(`${BASE}/applications/${applicationId}/decision`, body);
    } catch (error) {
      return devFallback(error, () => {
        const base = buildMockProjectFitApplication('', '');
        if (body.decision === 'APPROVE') {
          return {
            ...base,
            id: applicationId,
            status: 'APPROVED',
            commitmentStatus: 'DEPOSIT_REQUIRED',
            depositAmountCents: 100000,
            commercialType: 'COMMERCIAL',
          };
        }
        return { ...base, id: applicationId, status: 'REJECTED' };
      });
    }
  },

  confirmApplication: async (applicationId: string): Promise<ProjectFitApplication> =>
    post<ProjectFitApplication>(`${BASE}/applications/${applicationId}/confirm`),

  markDepositPaid: async (applicationId: string): Promise<ProjectFitApplication> => {
    try {
      return await post<ProjectFitApplication>(`${BASE}/applications/${applicationId}/deposit-paid`);
    } catch (error) {
      return devFallback(error, () => ({
        id: applicationId,
        listingId: '',
        fitAssessmentId: '',
        applicantUserId: '',
        status: 'APPROVED',
        commitmentStatus: 'DEPOSIT_PAID',
      }));
    }
  },

  clarifyApplication: (
    applicationId: string,
    body: ClarifyApplicationRequest
  ): Promise<ProjectFitApplication> =>
    post<ProjectFitApplication>(`${BASE}/applications/${applicationId}/clarify`, body),

  submitAppeal: async (body: SubmitProjectFitAppealRequest): Promise<ProjectFitAppeal> =>
    post<ProjectFitAppeal>(`${BASE}/appeals`, body),

  listMyAppeals: async (): Promise<ProjectFitAppeal[]> => {
    try {
      return await get<ProjectFitAppeal[]>(`${BASE}/appeals/mine`);
    } catch (error) {
      return devFallback(error, () => []);
    }
  },
};

/** R2 · 应用规则模板到项目（trusted-projects 子资源） */
export async function applyRuleTemplateToListing(
  listingId: string,
  body: ApplyRuleTemplateRequest
): Promise<ApplyRuleTemplateResponse> {
  try {
    const response = await apiClient.post(
      `/trusted-projects/${listingId}/apply-rule-template`,
      body
    );
    return unwrapApiData<ApplyRuleTemplateResponse>(response.data);
  } catch (error) {
    return devFallback(error, () => ({
      templateId: body.templateId,
      rulesApplied: buildMockEligibilityRules(listingId).length,
      rules: buildMockEligibilityRules(listingId),
    }));
  }
}
