/**
 * Identity Governance API 类型
 * @see docs/api/identity-governance-api.md
 * Swagger 标签：identity-governance、trusted-projects
 */

import type {
  AgencyCertificationStatus,
  ProfessionalCertificationStatus,
  PublishingLevel,
  VerificationStatus,
  VerificationType,
} from '@/types/account-governance';

// ── 账号中心 ──────────────────────────────────────────────

export type IdentityContextType = 'personal' | 'professional' | 'organization';

export interface SwitchAccountContextRequest {
  contextType: IdentityContextType;
  /** organization 时必填 */
  contextId?: string;
}

export interface AccountOverview {
  userId: string;
  activeContext: {
    type: IdentityContextType;
    contextId?: string | null;
    organizationId?: string | null;
  };
  verifications?: Array<{
    type: VerificationType;
    status: VerificationStatus;
    verifiedAt?: string | null;
    expiresAt?: string | null;
  }>;
  publishingPermission?: {
    level: PublishingLevel;
    status?: string;
    subjectType?: 'USER' | 'ORGANIZATION' | 'user' | 'organization';
    subjectId?: string;
    reason?: string | null;
    grantedAt?: string | null;
  } | null;
  professional?: {
    isVerifiedProfessional?: boolean;
    status?: ProfessionalCertificationStatus;
    verifiedAt?: string | null;
  } | null;
  agency?: {
    organizationId?: string;
    isVerified?: boolean;
    status?: AgencyCertificationStatus;
  } | null;
  subscriptions?: Array<{ plan: string; status: string }>;
  projectMemberships?: Array<{
    projectId: string;
    projectTitle?: string | null;
    roles: string[];
  }>;
  organizationMemberships?: Array<{
    organizationId: string;
    organizationName?: string | null;
    roles: string[];
    status?: string;
  }>;
}

export interface AccountPermissions {
  canPublishPublic?: boolean;
  canPublishCommercial?: boolean;
  canApplyToProjects?: boolean;
  canCreateTrustedListing?: boolean;
  [key: string]: unknown;
}

// ── 身份验证 ──────────────────────────────────────────────

export interface VerificationStatusSummary {
  records: Array<{
    type: VerificationType;
    status: VerificationStatus;
    verifiedAt?: string | null;
    expiresAt?: string | null;
  }>;
  emailVerified: boolean;
  phoneVerified: boolean;
  realNameVerified: boolean;
  ageVerified: boolean;
}

export interface StartVerificationRequest {
  type: 'PHONE' | 'REAL_NAME' | 'AGE';
  phone?: string;
  realName?: string;
  idNumberLast4?: string;
  birthYear?: number;
}

// ── Professional ──────────────────────────────────────────

export interface ProfessionalDraftBody {
  bio?: string;
  destinations?: string[];
  yearsOfExperience?: number;
  experienceSummary?: string;
  /** 前端扩展材料（后端可原样存储） */
  applicationMaterials?: Record<string, unknown>;
}

export interface ProfessionalStatus {
  status?: ProfessionalCertificationStatus;
  isVerifiedProfessional: boolean;
  verifiedAt?: string | null;
  bio?: string | null;
  destinations?: string[];
  yearsOfExperience?: number | null;
  submittedAt?: string | null;
}

// ── 机构 ──────────────────────────────────────────────────

export interface CreateOrganizationRequest {
  name: string;
  displayName?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  displayName?: string | null;
  certificationStatus?: AgencyCertificationStatus;
  isVerified?: boolean;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  organizationName?: string | null;
  roles: string[];
  invitedAt?: string;
}

export interface AgencyCertificationDraftBody {
  workspaceName?: string;
  entity?: Record<string, unknown>;
  authorization?: Record<string, unknown>;
  operations?: Record<string, unknown>;
  financial?: Record<string, unknown>;
}

export interface AgencyCertificationStatusResponse {
  organizationId: string;
  status: AgencyCertificationStatus;
  isVerified?: boolean;
  submittedAt?: string | null;
}

export interface InviteOrganizationMemberRequest {
  email: string;
  roles: string[];
}

// ── 发布权限 ──────────────────────────────────────────────

export type PublishingApplicationLevel = 'PUBLIC_NON_COMMERCIAL' | 'PUBLIC_COMMERCIAL';

export interface SubmitPublishingApplicationRequest {
  requestedLevel: PublishingApplicationLevel;
  reason: string;
  subjectType: 'USER' | 'ORGANIZATION';
  subjectId?: string;
}

export interface PublishingPermissionResponse {
  level: PublishingLevel;
  status?: string;
  subjectType?: 'USER' | 'ORGANIZATION';
  subjectId?: string;
  reason?: string | null;
  grantedAt?: string | null;
}

export interface PublishingApplicationRecord {
  id: string;
  requestedLevel: PublishingApplicationLevel;
  status: string;
  reason?: string | null;
  subjectType: 'USER' | 'ORGANIZATION';
  subjectId?: string;
  createdAt?: string;
}

// ── 资质 ──────────────────────────────────────────────────

export type QualificationSubjectType = 'USER' | 'ORGANIZATION';

export type QualificationType =
  | 'FIRST_AID'
  | 'OUTDOOR_GUIDE'
  | 'SKI_INSTRUCTOR'
  | string;

export type QualificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

export interface SubmitQualificationRequest {
  subjectType: QualificationSubjectType;
  subjectId: string;
  qualificationType: QualificationType;
  issuer: string;
  certificateNumber: string;
  validFrom?: string;
  validUntil?: string;
}

export interface QualificationRecord {
  id: string;
  subjectType: QualificationSubjectType;
  subjectId: string;
  qualificationType: QualificationType;
  issuer: string;
  certificateNumber?: string;
  status: QualificationStatus;
  validFrom?: string | null;
  validUntil?: string | null;
}

// ── 声誉 ──────────────────────────────────────────────────

export interface ReputationFacts {
  projectsCompleted: number;
  projectsCancelledByProvider: number;
  memberWithdrawals: number;
  complaintsConfirmed: number;
  paymentDisputesUnresolved: number;
  planBExecuted: number;
  safetyIncidentsConfirmed: number;
  lastProjectCompletedAt?: string | null;
}

export interface ReputationSummary {
  subjectType: QualificationSubjectType;
  subjectId: string;
  facts: ReputationFacts;
}

export interface ReputationEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  summary?: string | null;
  eventResult?: 'ACTIVE' | 'DISPUTED' | string | null;
}

// ── R2 · 声誉争议 ─────────────────────────────────────────

export type ReputationDisputeStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'UPHELD'
  | 'REJECTED';

export interface SubmitReputationDisputeRequest {
  eventId: string;
  reason: string;
}

export interface ReputationDispute {
  id: string;
  eventId: string;
  reason: string;
  status: ReputationDisputeStatus | string;
  resolution?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface ResolveReputationDisputeRequest {
  resolution: string;
  status: 'UPHELD' | 'REJECTED';
}

// ── 背书 ──────────────────────────────────────────────────

export type EndorsementType =
  | 'PROJECT_LEADERSHIP'
  | 'SAFETY_PRACTICES'
  | 'DESTINATION_EXPERTISE'
  | string;

export interface SubmitEndorsementRequest {
  endorserSubjectType: QualificationSubjectType;
  endorserSubjectId: string;
  subjectType: QualificationSubjectType;
  subjectId: string;
  endorsementType: EndorsementType;
  factStatement: string;
  relatedListingId?: string;
  relatedTripId?: string;
}

export interface EndorsementRecord {
  id: string;
  endorserSubjectType: QualificationSubjectType;
  endorserSubjectId: string;
  subjectType: QualificationSubjectType;
  subjectId: string;
  endorsementType: EndorsementType;
  factStatement: string;
  status?: string;
  activatedAt?: string | null;
}

// ── 信任档案 ──────────────────────────────────────────────

export interface TrustProfileVerification {
  emailVerified: boolean;
  phoneVerified: boolean;
  realNameVerified: boolean;
  ageVerified: boolean;
}

export interface TrustProfileProfessional {
  isVerifiedProfessional: boolean;
  verifiedAt?: string | null;
  bio?: string | null;
  destinations?: string[];
  yearsOfExperience?: number | null;
}

export interface TrustProfileAgency {
  organizationId: string;
  name?: string;
  isVerified?: boolean;
  verifiedAt?: string | null;
}

export interface UserTrustProfile {
  subjectType: 'USER';
  subjectId: string;
  displayName?: string;
  verification: TrustProfileVerification;
  professional: TrustProfileProfessional | null;
  agency: TrustProfileAgency | null;
  qualifications: QualificationRecord[];
  endorsements: EndorsementRecord[];
  reputationFacts: ReputationFacts;
}

export interface OrganizationTrustProfile {
  subjectType: 'ORGANIZATION';
  subjectId: string;
  displayName?: string;
  verification?: TrustProfileVerification;
  qualifications: QualificationRecord[];
  endorsements: EndorsementRecord[];
  reputationFacts: ReputationFacts;
}

export interface MyTrustProfile extends UserTrustProfile {
  pendingReviewCounts?: {
    qualifications?: number;
    endorsements?: number;
    professional?: number;
    agency?: number;
  };
}
