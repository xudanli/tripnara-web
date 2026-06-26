/**
 * Identity Governance API
 * Base: /identity/*
 * @see docs/api/identity-governance-api.md
 */

import apiClient from './client';
import { isApiNotReadyError } from '@/features/match-square/lib/match-square-api-mode';
import { unwrapApiData } from '@/lib/api-response';
import { buildMockMyReputationDisputes } from '@/lib/reputation-disputes-mock';
import type {
  AccountOverview,
  AccountPermissions,
  AgencyCertificationDraftBody,
  AgencyCertificationStatusResponse,
  CreateOrganizationRequest,
  InviteOrganizationMemberRequest,
  MyTrustProfile,
  OrganizationInvite,
  OrganizationSummary,
  OrganizationTrustProfile,
  ProfessionalDraftBody,
  ProfessionalStatus,
  PublishingApplicationRecord,
  PublishingPermissionResponse,
  QualificationRecord,
  ReputationEvent,
  ReputationSummary,
  ReputationDispute,
  SubmitReputationDisputeRequest,
  StartVerificationRequest,
  SubmitEndorsementRequest,
  SubmitPublishingApplicationRequest,
  SubmitQualificationRequest,
  SwitchAccountContextRequest,
  UserTrustProfile,
  VerificationStatusSummary,
  EndorsementRecord,
} from '@/types/identity-governance';

const IDENTITY = '/identity';

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get(path, params ? { params } : undefined);
  return unwrapApiData<T>(response.data);
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiClient.post(path, body ?? {});
  return unwrapApiData<T>(response.data);
}

export const identityGovernanceApi = {
  // ── 1. 账号中心 ─────────────────────────────────────────
  getAccountOverview: (): Promise<AccountOverview> =>
    get<AccountOverview>(`${IDENTITY}/account/overview`),

  getAccountPermissions: (): Promise<AccountPermissions> =>
    get<AccountPermissions>(`${IDENTITY}/account/permissions`),

  switchAccountContext: (body: SwitchAccountContextRequest): Promise<AccountOverview> =>
    post<AccountOverview>(`${IDENTITY}/account/context/switch`, body),

  // ── 2. 身份验证 ─────────────────────────────────────────
  getVerificationStatus: (): Promise<VerificationStatusSummary> =>
    get<VerificationStatusSummary>(`${IDENTITY}/verification/status`),

  getVerificationTypes: (): Promise<string[]> =>
    get<string[]>(`${IDENTITY}/verification/types`),

  startVerification: (body: StartVerificationRequest): Promise<unknown> =>
    post(`${IDENTITY}/verification/start`, body),

  // ── 3. Professional ─────────────────────────────────────
  getProfessionalStatus: (): Promise<ProfessionalStatus> =>
    get<ProfessionalStatus>(`${IDENTITY}/professional/status`),

  saveProfessionalDraft: (body: ProfessionalDraftBody): Promise<ProfessionalStatus> =>
    post<ProfessionalStatus>(`${IDENTITY}/professional/draft`, body),

  submitProfessional: (): Promise<ProfessionalStatus> =>
    post<ProfessionalStatus>(`${IDENTITY}/professional/submit`),

  getProjectMemberships: (): Promise<AccountOverview['projectMemberships']> =>
    get(`${IDENTITY}/project-memberships`),

  // ── 4. 机构 / Agency ─────────────────────────────────────
  createOrganization: (body: CreateOrganizationRequest): Promise<OrganizationSummary> =>
    post<OrganizationSummary>(`${IDENTITY}/organizations`, body),

  getMyOrganizations: (): Promise<OrganizationSummary[]> =>
    get<OrganizationSummary[]>(`${IDENTITY}/organizations/mine`),

  getPendingOrganizationInvites: (): Promise<OrganizationInvite[]> =>
    get<OrganizationInvite[]>(`${IDENTITY}/organizations/invites/pending`),

  getAgencyCertificationStatus: (organizationId: string): Promise<AgencyCertificationStatusResponse> =>
    get<AgencyCertificationStatusResponse>(
      `${IDENTITY}/organizations/${organizationId}/certification/status`
    ),

  saveAgencyCertificationDraft: (
    organizationId: string,
    body: AgencyCertificationDraftBody
  ): Promise<AgencyCertificationStatusResponse> =>
    post<AgencyCertificationStatusResponse>(
      `${IDENTITY}/organizations/${organizationId}/certification/draft`,
      body
    ),

  submitAgencyCertification: (organizationId: string): Promise<AgencyCertificationStatusResponse> =>
    post<AgencyCertificationStatusResponse>(
      `${IDENTITY}/organizations/${organizationId}/certification/submit`
    ),

  getOrganizationMembers: (organizationId: string): Promise<unknown[]> =>
    get(`${IDENTITY}/organizations/${organizationId}/members`),

  inviteOrganizationMember: (
    organizationId: string,
    body: InviteOrganizationMemberRequest
  ): Promise<unknown> =>
    post(`${IDENTITY}/organizations/${organizationId}/members/invite`, body),

  acceptOrganizationInvite: (organizationId: string): Promise<unknown> =>
    post(`${IDENTITY}/organizations/${organizationId}/members/accept`),

  declineOrganizationInvite: (organizationId: string): Promise<unknown> =>
    post(`${IDENTITY}/organizations/${organizationId}/members/decline`),

  removeOrganizationMember: (organizationId: string, userId: string): Promise<unknown> =>
    post(`${IDENTITY}/organizations/${organizationId}/members/${userId}/remove`),

  // ── 5. 发布权限 ─────────────────────────────────────────
  getPublishingPermission: (): Promise<PublishingPermissionResponse> =>
    get<PublishingPermissionResponse>(`${IDENTITY}/publishing/permission`),

  getPublishingApplications: (): Promise<PublishingApplicationRecord[]> =>
    get<PublishingApplicationRecord[]>(`${IDENTITY}/publishing/applications`),

  submitPublishingApplication: (
    body: SubmitPublishingApplicationRequest
  ): Promise<PublishingApplicationRecord> =>
    post<PublishingApplicationRecord>(`${IDENTITY}/publishing/applications`, body),

  // ── 7. 资质 ─────────────────────────────────────────────
  getMyQualifications: (): Promise<QualificationRecord[]> =>
    get<QualificationRecord[]>(`${IDENTITY}/qualifications/mine`),

  submitQualification: (body: SubmitQualificationRequest): Promise<QualificationRecord> =>
    post<QualificationRecord>(`${IDENTITY}/qualifications`, body),

  getSubjectQualifications: (
    subjectType: 'USER' | 'ORGANIZATION',
    subjectId: string
  ): Promise<QualificationRecord[]> =>
    get<QualificationRecord[]>(`${IDENTITY}/qualifications/subjects/${subjectType}/${subjectId}`),

  // ── 8. 声誉 ─────────────────────────────────────────────
  getReputationSummary: (
    subjectType: 'USER' | 'ORGANIZATION',
    subjectId: string
  ): Promise<ReputationSummary> =>
    get<ReputationSummary>(`${IDENTITY}/reputation/${subjectType}/${subjectId}/summary`),

  getReputationEvents: (
    subjectType: 'USER' | 'ORGANIZATION',
    subjectId: string,
    limit = 20
  ): Promise<ReputationEvent[]> =>
    get<ReputationEvent[]>(
      `${IDENTITY}/reputation/${subjectType}/${subjectId}/events`,
      { limit }
    ),

  submitReputationDispute: async (body: SubmitReputationDisputeRequest): Promise<ReputationDispute> => {
    try {
      return await post<ReputationDispute>(`${IDENTITY}/reputation/disputes`, body);
    } catch (error) {
      if (import.meta.env.DEV && isIdentityApiNotReady(error)) {
        return {
          id: `rep-dispute-${Date.now()}`,
          eventId: body.eventId,
          reason: body.reason,
          status: 'SUBMITTED',
          createdAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  },

  listMyReputationDisputes: async (): Promise<ReputationDispute[]> => {
    try {
      return await get<ReputationDispute[]>(`${IDENTITY}/reputation/disputes/mine`);
    } catch (error) {
      if (import.meta.env.DEV && isIdentityApiNotReady(error)) {
        return buildMockMyReputationDisputes();
      }
      throw error;
    }
  },

  // ── 9. 背书 ─────────────────────────────────────────────
  submitEndorsement: (body: SubmitEndorsementRequest): Promise<EndorsementRecord> =>
    post<EndorsementRecord>(`${IDENTITY}/endorsements`, body),

  getSubjectEndorsements: (
    subjectType: 'USER' | 'ORGANIZATION',
    subjectId: string
  ): Promise<EndorsementRecord[]> =>
    get<EndorsementRecord[]>(`${IDENTITY}/endorsements/subjects/${subjectType}/${subjectId}`),

  getIssuerEndorsements: (
    subjectType: 'USER' | 'ORGANIZATION',
    subjectId: string
  ): Promise<EndorsementRecord[]> =>
    get<EndorsementRecord[]>(`${IDENTITY}/endorsements/issuers/${subjectType}/${subjectId}`),

  // ── 10. 信任档案 ─────────────────────────────────────────
  getMyTrustProfile: (): Promise<MyTrustProfile> =>
    get<MyTrustProfile>(`${IDENTITY}/trust-profiles/me`),

  getUserTrustProfile: (userId: string): Promise<UserTrustProfile> =>
    get<UserTrustProfile>(`${IDENTITY}/trust-profiles/users/${userId}`),

  getOrganizationTrustProfile: (organizationId: string): Promise<OrganizationTrustProfile> =>
    get<OrganizationTrustProfile>(`${IDENTITY}/trust-profiles/organizations/${organizationId}`),
};

/** DEV：identity API 未就绪时是否可降级 */
export function isIdentityApiNotReady(error: unknown): boolean {
  return isApiNotReadyError(error) || (error as { response?: { status?: number } }).response?.status === 404;
}
