import type {
  AccountCapabilities,
  AccountContext,
  AgencyCertificationStatus,
  OrganizationMembershipSummary,
  ProfessionalCertificationStatus,
  ProjectMembershipSummary,
  PublishingLevel,
  PublishingPermission,
  PublishingPermissionStatus,
  SubscriptionEntitlement,
  UserVerification,
  VerificationStatus,
  VerificationType,
} from '@/types/account-governance';
import type { AccountOverview } from '@/types/identity-governance';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function readBool(v: unknown): boolean | undefined {
  if (v === true || v === 1 || v === 'true') return true;
  if (v === false || v === 0 || v === 'false') return false;
  return undefined;
}

const VERIFICATION_STATUSES = new Set<VerificationStatus>([
  'NOT_STARTED',
  'PENDING',
  'NEED_MORE_INFO',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
  'SUSPENDED',
  'REVOKED',
]);

const VERIFICATION_TYPES = new Set<VerificationType>([
  'PHONE',
  'EMAIL',
  'REAL_NAME',
  'AGE',
  'FACE',
  'ENTERPRISE',
]);

const PUBLISHING_LEVELS = new Set<PublishingLevel>([
  'NONE',
  'PRIVATE_ONLY',
  'PUBLIC_NON_COMMERCIAL',
  'PUBLIC_COMMERCIAL',
  'SUSPENDED',
]);

function readVerificationStatus(v: unknown): VerificationStatus {
  const s = readString(v)?.toUpperCase() as VerificationStatus | undefined;
  return s && VERIFICATION_STATUSES.has(s) ? s : 'NOT_STARTED';
}

function readVerificationType(v: unknown): VerificationType | null {
  const t = readString(v)?.toUpperCase() as VerificationType | undefined;
  return t && VERIFICATION_TYPES.has(t) ? t : null;
}

function normalizeVerification(raw: unknown, userId: string): UserVerification | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const type = readVerificationType(r.type ?? r.verificationType ?? r.verification_type);
  if (!type) return null;
  return {
    userId: readString(r.userId ?? r.user_id) ?? userId,
    type,
    status: readVerificationStatus(r.status),
    verifiedAt: readString(r.verifiedAt ?? r.verified_at) ?? null,
    expiresAt: readString(r.expiresAt ?? r.expires_at) ?? null,
  };
}

function normalizePublishingPermission(raw: unknown): PublishingPermission | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const levelRaw = readString(r.level)?.toUpperCase() as PublishingLevel | undefined;
  const level = levelRaw && PUBLISHING_LEVELS.has(levelRaw) ? levelRaw : 'PRIVATE_ONLY';
  const statusRaw = readString(r.status)?.toUpperCase() as PublishingPermissionStatus | undefined;
  const status: PublishingPermissionStatus =
    statusRaw === 'SUSPENDED' || statusRaw === 'REVOKED' ? statusRaw : 'ACTIVE';
  return {
    subjectType: readString(r.subjectType ?? r.subject_type) === 'organization' ? 'organization' : 'user',
    subjectId: readString(r.subjectId ?? r.subject_id) ?? '',
    level,
    status,
    reason: readString(r.reason) ?? null,
    grantedAt: readString(r.grantedAt ?? r.granted_at) ?? null,
  };
}

function normalizeProjectRole(raw: unknown): ProjectMembershipSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const projectId = readString(r.projectId ?? r.project_id);
  if (!projectId) return null;
  const rolesRaw = r.roles;
  const roles: ProjectMembershipSummary['roles'] = [];
  if (Array.isArray(rolesRaw)) {
    for (const role of rolesRaw) {
      const normalized = readString(role)?.toUpperCase();
      if (normalized === 'ORGANIZER' || normalized === 'PARTICIPANT' || normalized === 'PAYER') {
        roles.push(normalized);
      }
    }
  }
  return {
    projectId,
    projectTitle: readString(r.projectTitle ?? r.project_title) ?? null,
    roles: roles.length ? roles : ['PARTICIPANT'],
  };
}

function normalizeOrganizationRole(raw: unknown): OrganizationMembershipSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const organizationId = readString(r.organizationId ?? r.organization_id);
  if (!organizationId) return null;
  const rolesRaw = r.roles;
  const roles: OrganizationMembershipSummary['roles'] = [];
  const allowed = ['OWNER', 'AGENCY_ADMIN', 'ADVISOR', 'LEADER', 'OPERATIONS', 'FINANCE'] as const;
  if (Array.isArray(rolesRaw)) {
    for (const role of rolesRaw) {
      const normalized = readString(role)?.toUpperCase();
      if (allowed.includes(normalized as (typeof allowed)[number])) {
        roles.push(normalized as OrganizationMembershipSummary['roles'][number]);
      }
    }
  }
  const statusRaw = readString(r.status)?.toUpperCase();
  const status: OrganizationMembershipSummary['status'] =
    statusRaw === 'INVITED' ||
    statusRaw === 'ACTIVE' ||
    statusRaw === 'SUSPENDED' ||
    statusRaw === 'LEFT' ||
    statusRaw === 'REMOVED'
      ? statusRaw
      : 'ACTIVE';
  return {
    organizationId,
    organizationName: readString(r.organizationName ?? r.organization_name) ?? null,
    roles,
    status,
  };
}

function normalizeSubscription(raw: unknown): SubscriptionEntitlement | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const plan = readString(r.plan) ?? 'FREE';
  const statusRaw = readString(r.status)?.toUpperCase();
  const status: SubscriptionEntitlement['status'] =
    statusRaw === 'EXPIRED' || statusRaw === 'CANCELLED' ? statusRaw : 'ACTIVE';
  return { plan, status };
}

function normalizeContext(raw: unknown): AccountContext {
  if (!raw || typeof raw !== 'object') return { type: 'personal' };
  const r = raw as Record<string, unknown>;
  const type = readString(r.type ?? r.contextType ?? r.context_type)?.toLowerCase();
  if (type === 'professional') return { type: 'professional' };
  if (type === 'organization') {
    const organizationId =
      readString(r.organizationId ?? r.organization_id ?? r.contextId ?? r.context_id);
    if (organizationId) return { type: 'organization', organizationId };
  }
  return { type: 'personal' };
}

const PROFESSIONAL_STATUSES = new Set<ProfessionalCertificationStatus>([
  'NOT_STARTED',
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEED_MORE_INFO',
  'VERIFIED',
  'REJECTED',
  'EXPIRED',
  'SUSPENDED',
  'REVOKED',
]);

const AGENCY_STATUSES = new Set<AgencyCertificationStatus>([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED',
]);

function readProfessionalStatus(v: unknown): ProfessionalCertificationStatus | undefined {
  const s = readString(v)?.toUpperCase() as ProfessionalCertificationStatus | undefined;
  return s && PROFESSIONAL_STATUSES.has(s) ? s : undefined;
}

function readAgencyStatus(v: unknown): AgencyCertificationStatus | undefined {
  const s = readString(v)?.toUpperCase() as AgencyCertificationStatus | undefined;
  return s && AGENCY_STATUSES.has(s) ? s : undefined;
}

/** GET /identity/account/overview → AccountCapabilities */
export function normalizeAccountOverview(
  raw: unknown,
  fallbackUserId = ''
): AccountCapabilities | null {
  if (!raw || typeof raw !== 'object') return null;
  const overview = raw as AccountOverview;
  const r = raw as Record<string, unknown>;
  const userId = readString(overview.userId ?? r.user_id) ?? fallbackUserId;
  if (!userId) return null;

  const base = normalizeAccountCapabilities(raw, fallbackUserId);
  if (!base) {
    return {
      userId,
      activeContext: normalizeContext(overview.activeContext ?? r.active_context),
      verifications: [],
      publishingPermission: null,
      subscriptions: [],
      projectRoles: [],
      organizationRoles: [],
      professionalVerified: false,
      agencyVerified: false,
    };
  }

  const professional = overview.professional ?? (r.professional as AccountOverview['professional']);
  const agency = overview.agency ?? (r.agency as AccountOverview['agency']);

  return {
    ...base,
    userId,
    activeContext: normalizeContext(overview.activeContext ?? r.active_context),
    professionalVerified:
      readBool(professional?.isVerifiedProfessional) ??
      readBool(r.isVerifiedProfessional ?? r.is_verified_professional) ??
      base.professionalVerified,
    agencyVerified:
      readBool(agency?.isVerified) ??
      readBool(r.agencyVerified ?? r.agency_verified) ??
      base.agencyVerified,
    professionalCertificationStatus:
      readProfessionalStatus(professional?.status) ??
      (readBool(professional?.isVerifiedProfessional) ? 'VERIFIED' : undefined),
    agencyCertificationStatus:
      readAgencyStatus(agency?.status) ?? (readBool(agency?.isVerified) ? 'VERIFIED' : undefined),
  };
}

/** GET /account/capabilities → AccountCapabilities */
export function normalizeAccountCapabilities(
  raw: unknown,
  fallbackUserId = ''
): AccountCapabilities | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const userId = readString(r.userId ?? r.user_id) ?? fallbackUserId;
  if (!userId) return null;

  const verificationsRaw = r.verifications;
  const verifications: UserVerification[] = Array.isArray(verificationsRaw)
    ? verificationsRaw
        .map((item) => normalizeVerification(item, userId))
        .filter((item): item is UserVerification => item != null)
    : [];

  const verificationSummary = r.verification;
  if (verifications.length === 0 && verificationSummary && typeof verificationSummary === 'object') {
    const summaryRecords = (verificationSummary as Record<string, unknown>).records;
    if (Array.isArray(summaryRecords)) {
      for (const item of summaryRecords) {
        const normalized = normalizeVerification(item, userId);
        if (normalized) verifications.push(normalized);
      }
    }
  }

  const projectRolesRaw =
    r.projectRoles ??
    r.project_roles ??
    r.projectMemberships ??
    r.project_memberships;
  const projectRoles: ProjectMembershipSummary[] = Array.isArray(projectRolesRaw)
    ? projectRolesRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          const projectId =
            readString(row.projectId ?? row.project_id ?? row.tripId ?? row.trip_id) ?? '';
          if (!projectId) return null;
          const rolesRaw = row.roles;
          const roles: ProjectMembershipSummary['roles'] = [];
          if (Array.isArray(rolesRaw)) {
            for (const role of rolesRaw) {
              const normalized = readString(role)?.toUpperCase();
              if (normalized === 'ORGANIZER' || normalized === 'PARTICIPANT' || normalized === 'PAYER') {
                roles.push(normalized);
              }
            }
          }
          return {
            projectId,
            projectTitle: readString(row.projectTitle ?? row.project_title) ?? null,
            roles: roles.length ? roles : ['PARTICIPANT'],
          };
        })
        .filter((item): item is ProjectMembershipSummary => item != null)
    : [];

  const orgRolesRaw =
    r.organizationRoles ??
    r.organization_roles ??
    r.organizationMemberships ??
    r.organization_memberships ??
    r.organizations;
  const organizationRoles: OrganizationMembershipSummary[] = Array.isArray(orgRolesRaw)
    ? orgRolesRaw
        .map(normalizeOrganizationRole)
        .filter((item): item is OrganizationMembershipSummary => item != null)
    : [];

  const subscriptionsRaw = r.subscriptions;
  const subscriptions: SubscriptionEntitlement[] = Array.isArray(subscriptionsRaw)
    ? subscriptionsRaw
        .map(normalizeSubscription)
        .filter((item): item is SubscriptionEntitlement => item != null)
    : [];

  const publishingRaw = r.publishingPermission ?? r.publishing_permission;
  const publishingPermission = normalizePublishingPermission(publishingRaw);

  return {
    userId,
    activeContext: normalizeContext(r.activeContext ?? r.active_context),
    verifications,
    publishingPermission,
    subscriptions,
    projectRoles,
    organizationRoles,
    professionalVerified: readBool(r.professionalVerified ?? r.professional_verified) ?? false,
    agencyVerified: readBool(r.agencyVerified ?? r.agency_verified) ?? false,
    professionalCertificationStatus: readProfessionalStatus(
      r.professionalCertificationStatus ?? r.professional_certification_status
    ),
    agencyCertificationStatus: readAgencyStatus(
      r.agencyCertificationStatus ?? r.agency_certification_status
    ),
  };
}
