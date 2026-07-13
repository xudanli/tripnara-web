/**
 * 账号治理 · 权限推导（PRD V1.0 §11 / §15）
 */
import type {
  AccountCapabilities,
  AgencyCertificationStatus,
  ProfessionalCertificationStatus,
  PublishingLevel,
  PublishingPermission,
  UserVerification,
  VerificationStatus,
} from '@/types/account-governance';
import { readAgencyCertificationDraft } from '@/lib/agency-certification-draft';
import { readProfessionalCertificationDraft } from '@/lib/professional-certification-draft';

const ACTIVE_VERIFICATION: VerificationStatus = 'VERIFIED';

export function isVerificationActive(v: UserVerification): boolean {
  if (v.status !== ACTIVE_VERIFICATION) return false;
  if (!v.expiresAt) return true;
  return new Date(v.expiresAt).getTime() > Date.now();
}

export function hasActiveVerification(
  verifications: UserVerification[] | undefined,
  type: UserVerification['type']
): boolean {
  return (verifications ?? []).some((v) => v.type === type && isVerificationActive(v));
}

export function isPublishingLevelPublic(level: PublishingLevel | undefined | null): boolean {
  return level === 'PUBLIC_NON_COMMERCIAL' || level === 'PUBLIC_COMMERCIAL';
}

export function canPublishPublicRecruitment(
  permission: PublishingPermission | null | undefined,
  options?: { professionalVerified?: boolean; agencyVerified?: boolean }
): boolean {
  if (!permission || permission.status !== 'ACTIVE') return false;
  if (permission.level === 'SUSPENDED' || permission.level === 'NONE' || permission.level === 'PRIVATE_ONLY') {
    return false;
  }
  if (!isPublishingLevelPublic(permission.level)) return false;
  return options?.professionalVerified === true || options?.agencyVerified === true;
}

/** 可信项目发布入口 · 不可发布时的说明文案 */
export function trustedProjectPublishBlockReason(
  caps: AccountCapabilities | null | undefined
): string {
  if (
    canPublishPublicRecruitment(caps?.publishingPermission, {
      professionalVerified: caps?.professionalVerified,
      agencyVerified: caps?.agencyVerified,
    })
  ) {
    return '';
  }
  if (!caps?.professionalVerified && !caps?.agencyVerified) {
    return '公开发布需完成专业领队或机构认证，并申请发布权限。';
  }
  return publishingBlockReason(caps?.publishingPermission ?? null);
}

export function canCreatePrivateProject(_caps?: AccountCapabilities | null): boolean {
  return true;
}

export function publishingBlockReason(
  permission: PublishingPermission | null | undefined
): string {
  if (!permission || permission.level === 'NONE' || permission.level === 'PRIVATE_ONLY') {
    return '公开发布需完成专业认证并申请发布权限。私人项目可直接邀请已知成员。';
  }
  if (permission.status === 'SUSPENDED' || permission.level === 'SUSPENDED') {
    return permission.reason?.trim() || '发布权限已暂停，请联系平台了解详情。';
  }
  return '公开发布需专业认证与项目审核通过。';
}

const VERIFICATION_TYPE_LABELS: Record<UserVerification['type'], string> = {
  PHONE: '手机号',
  EMAIL: '邮箱',
  REAL_NAME: '实名',
  AGE: '年龄',
  FACE: '人脸核验',
  ENTERPRISE: '企业主体',
};

const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  NOT_STARTED: '未开始',
  PENDING: '审核中',
  NEED_MORE_INFO: '待补件',
  VERIFIED: '已验证',
  REJECTED: '未通过',
  EXPIRED: '已过期',
  SUSPENDED: '已暂停',
  REVOKED: '已撤销',
};

const PUBLISHING_LEVEL_LABELS: Record<PublishingLevel, string> = {
  NONE: '无',
  PRIVATE_ONLY: '仅私人项目',
  PUBLIC_NON_COMMERCIAL: '公开非商业',
  PUBLIC_COMMERCIAL: '公开商业',
  SUSPENDED: '已暂停',
};

export function verificationTypeLabel(type: UserVerification['type']): string {
  return VERIFICATION_TYPE_LABELS[type];
}

export function verificationStatusLabel(status: VerificationStatus): string {
  return VERIFICATION_STATUS_LABELS[status];
}

export function publishingLevelLabel(level: PublishingLevel): string {
  return PUBLISHING_LEVEL_LABELS[level];
}

export function subscriptionPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    FREE: '免费版',
    ORGANIZER_PRO: '组织者专业版',
    PROFESSIONAL_PRO: '领队专业版',
    AGENCY_PLAN: '机构专业版',
  };
  return labels[plan] ?? plan;
}

export function subscriptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: '有效',
    EXPIRED: '已过期',
    CANCELLED: '已取消',
  };
  return labels[status] ?? status;
}

const PROJECT_ROLE_LABELS: Record<string, string> = {
  ORGANIZER: '组织者',
  PARTICIPANT: '队员',
  PAYER: '付款人',
};

export function projectRoleLabel(role: string): string {
  const key = role.trim().toUpperCase();
  return PROJECT_ROLE_LABELS[key] ?? role;
}

const ORGANIZATION_ROLE_LABELS: Record<string, string> = {
  OWNER: '所有者',
  AGENCY_ADMIN: '机构管理员',
  ADVISOR: '顾问',
  LEADER: '领队',
  OPERATIONS: '运营',
  FINANCE: '财务',
};

export function organizationRoleLabel(role: string): string {
  const key = role.trim().toUpperCase();
  return ORGANIZATION_ROLE_LABELS[key] ?? role;
}

const ORGANIZATION_MEMBER_STATUS_LABELS: Record<string, string> = {
  INVITED: '已邀请',
  ACTIVE: '有效',
  SUSPENDED: '已暂停',
  LEFT: '已离开',
  REMOVED: '已移除',
};

export function organizationMemberStatusLabel(status: string): string {
  const key = status.trim().toUpperCase();
  return ORGANIZATION_MEMBER_STATUS_LABELS[key] ?? status;
}

export function accountContextLabel(
  context: AccountCapabilities['activeContext']
): string {
  if (context.type === 'professional') return '专业身份';
  if (context.type === 'organization') return '机构空间';
  return '个人旅行';
}

const PROFESSIONAL_STATUS_LABELS: Record<ProfessionalCertificationStatus, string> = {
  NOT_STARTED: '未开始',
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  UNDER_REVIEW: '审核中',
  NEED_MORE_INFO: '待补件',
  VERIFIED: '已认证',
  REJECTED: '未通过',
  EXPIRED: '已过期',
  SUSPENDED: '已暂停',
  REVOKED: '已撤销',
};

export function professionalCertificationStatusLabel(
  status: ProfessionalCertificationStatus
): string {
  return PROFESSIONAL_STATUS_LABELS[status];
}

export function resolveProfessionalCertificationStatus(
  caps: AccountCapabilities | null | undefined
): ProfessionalCertificationStatus {
  if (caps?.professionalCertificationStatus) return caps.professionalCertificationStatus;
  if (caps?.professionalVerified) return 'VERIFIED';
  const localDraft = readProfessionalCertificationDraft();
  if (localDraft?.status === 'SUBMITTED') return 'SUBMITTED';
  if (localDraft?.status === 'DRAFT') return 'DRAFT';
  return 'NOT_STARTED';
}

const AGENCY_STATUS_LABELS: Record<AgencyCertificationStatus, string> = {
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  UNDER_REVIEW: '审核中',
  VERIFIED: '已认证',
  REJECTED: '未通过',
  SUSPENDED: '已暂停',
};

export function agencyCertificationStatusLabel(status: AgencyCertificationStatus): string {
  return AGENCY_STATUS_LABELS[status];
}

export function resolveAgencyCertificationStatus(
  caps: AccountCapabilities | null | undefined
): AgencyCertificationStatus {
  if (caps?.agencyCertificationStatus) return caps.agencyCertificationStatus;
  if (caps?.agencyVerified) return 'VERIFIED';
  const localDraft = readAgencyCertificationDraft();
  if (localDraft?.status === 'SUBMITTED') return 'SUBMITTED';
  if (localDraft?.status === 'DRAFT') return 'DRAFT';
  return 'DRAFT';
}

/** 合并本机认证草稿状态，避免 Settings 与权限判断数据源不一致 */
export function applyCapabilitiesLocalDraftOverlay(
  caps: AccountCapabilities
): AccountCapabilities {
  return {
    ...caps,
    professionalCertificationStatus: resolveProfessionalCertificationStatus(caps),
    agencyCertificationStatus: resolveAgencyCertificationStatus(caps),
  };
}

/**
 * DEV：模拟已通过 Professional 认证 + 公开发布权限（仅本地联调）。
 * 在 .env.development 设置 VITE_DEV_SIMULATE_PUBLISH=1 启用。
 */
export function applyDevCapabilitiesSimulation(caps: AccountCapabilities): AccountCapabilities {
  if (!import.meta.env.DEV || import.meta.env.VITE_DEV_SIMULATE_PUBLISH !== '1') {
    return caps;
  }
  return {
    ...caps,
    professionalVerified: true,
    professionalCertificationStatus: 'VERIFIED',
    publishingPermission: {
      subjectType: 'user',
      subjectId: caps.userId,
      level: 'PUBLIC_NON_COMMERCIAL',
      status: 'ACTIVE',
      reason: null,
      grantedAt: new Date().toISOString(),
    },
  };
}

export function finalizeAccountCapabilities(caps: AccountCapabilities): AccountCapabilities {
  return applyDevCapabilitiesSimulation(applyCapabilitiesLocalDraftOverlay(caps));
}

export function isProfessionalCertificationPending(
  status: ProfessionalCertificationStatus
): boolean {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'NEED_MORE_INFO';
}

