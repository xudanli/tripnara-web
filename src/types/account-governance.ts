/**
 * 账号治理 · 组合式身份与权限（PRD V1.0 R0）
 * 订阅、专业认证与发布权限相互独立。
 */

export type VerificationStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'NEED_MORE_INFO'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED';

export type VerificationType =
  | 'PHONE'
  | 'EMAIL'
  | 'REAL_NAME'
  | 'AGE'
  | 'FACE'
  | 'ENTERPRISE';

export type PublishingLevel =
  | 'NONE'
  | 'PRIVATE_ONLY'
  | 'PUBLIC_NON_COMMERCIAL'
  | 'PUBLIC_COMMERCIAL'
  | 'SUSPENDED';

export type PublishingPermissionStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export type AccountContext =
  | { type: 'personal' }
  | { type: 'professional' }
  | { type: 'organization'; organizationId: string };

export interface UserVerification {
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  verifiedAt?: string | null;
  expiresAt?: string | null;
}

export interface PublishingPermission {
  subjectType: 'user' | 'organization';
  subjectId: string;
  level: PublishingLevel;
  status: PublishingPermissionStatus;
  reason?: string | null;
  grantedAt?: string | null;
}

export interface ProjectMembershipSummary {
  projectId: string;
  projectTitle?: string | null;
  roles: Array<'PARTICIPANT' | 'ORGANIZER' | 'PAYER'>;
}

export interface OrganizationMembershipSummary {
  organizationId: string;
  organizationName?: string | null;
  roles: Array<'OWNER' | 'AGENCY_ADMIN' | 'ADVISOR' | 'LEADER' | 'OPERATIONS' | 'FINANCE'>;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'LEFT' | 'REMOVED';
}

export interface SubscriptionEntitlement {
  plan: 'FREE' | 'ORGANIZER_PRO' | 'PROFESSIONAL_PRO' | 'AGENCY_PLAN' | string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

export interface AccountCapabilities {
  userId: string;
  activeContext: AccountContext;
  verifications: UserVerification[];
  publishingPermission: PublishingPermission | null;
  subscriptions: SubscriptionEntitlement[];
  projectRoles: ProjectMembershipSummary[];
  organizationRoles: OrganizationMembershipSummary[];
  /** Professional 认证有效（R1 由后端填充） */
  professionalVerified?: boolean;
  /** Agency 企业认证有效（R1 由后端填充） */
  agencyVerified?: boolean;
  /** Professional 认证流程状态（R1） */
  professionalCertificationStatus?: ProfessionalCertificationStatus;
  /** Agency 认证流程状态（R1） */
  agencyCertificationStatus?: AgencyCertificationStatus;
}

export type ProfessionalCertificationStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEED_MORE_INFO'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED';

export type AgencyCertificationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';
