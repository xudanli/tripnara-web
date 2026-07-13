import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { AccountCapabilities } from '@/types/account-governance';
import type {
  AdvisorTripContactForm,
  AdvisorTripCreateFormState,
  AdvisorTripMemberInviteCode,
  AdvisorTripStakeholder,
  AdvisorTripStakeholderInput,
  CreateAdvisorTripRequest,
  OrganizationStaffOption,
} from '@/types/advisor-trip-create';

const ADVISOR_ORG_ROLES = new Set([
  'OWNER',
  'AGENCY_ADMIN',
  'ADVISOR',
  'LEADER',
  'OPERATIONS',
]);

const ROLE_INVITE_LABELS: Record<string, string> = {
  primaryContact: '主联系人',
  payer: '付款人',
  finalConfirmer: '最终确认人',
  advisor: '顾问',
  leader: '领队',
};

export function computeTripDayCount(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 0;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return differenceInCalendarDays(end, start) + 1;
}

export function canAccessAdvisorTripCreate(
  caps: AccountCapabilities | null | undefined,
): boolean {
  if (!caps) return false;
  if (caps.agencyVerified || caps.professionalVerified) return true;
  return (caps.organizationRoles ?? []).some(
    (m) => m.status === 'ACTIVE' && m.roles.some((r) => ADVISOR_ORG_ROLES.has(r)),
  );
}

export function resolveActiveOrganizationId(
  caps: AccountCapabilities | null | undefined,
): string | undefined {
  if (!caps) return undefined;
  if (caps.activeContext.type === 'organization') {
    return caps.activeContext.organizationId;
  }
  const activeOrg = (caps.organizationRoles ?? []).find((m) => m.status === 'ACTIVE');
  return activeOrg?.organizationId;
}

export function createDefaultAdvisorTripForm(
  options?: {
    advisorName?: string;
    advisorUserId?: string;
    organizationId?: string;
  },
): AdvisorTripCreateFormState {
  return {
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    dayCount: 0,
    estimatedHeadcount: 6,
    totalBudget: 0,
    knownRequirements: '',
    primaryContact: { name: '', email: '' },
    payer: { name: '', email: '', phone: '' },
    payerSameAsPrimary: true,
    finalConfirmer: { name: '', phone: '' },
    advisor: {
      userId: options?.advisorUserId,
      name: options?.advisorName ?? '',
    },
    leader: { name: '' },
    organizationId: options?.organizationId,
  };
}

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** 将表单干系人映射为 API 请求体字段 */
export function serializeStakeholder(
  contact: AdvisorTripContactForm,
  options?: { asStringIfNameOnly?: boolean },
): AdvisorTripStakeholderInput {
  const name = contact.name.trim();
  const email = trimOptional(contact.email);
  const phone = trimOptional(contact.phone);
  const userId = trimOptional(contact.userId);

  if (userId) {
    const payload: AdvisorTripStakeholder = { userId };
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (phone) payload.phone = phone;
    return payload;
  }

  if (options?.asStringIfNameOnly && name && !email && !phone) {
    return name;
  }

  const payload: AdvisorTripStakeholder = {};
  if (name) payload.name = name;
  if (email) payload.email = email;
  if (phone) payload.phone = phone;
  return payload;
}

export function buildCreateAdvisorTripRequest(
  form: AdvisorTripCreateFormState,
): CreateAdvisorTripRequest {
  const payerContact = form.payerSameAsPrimary ? form.primaryContact : form.payer;

  return {
    name: form.name.trim() || undefined,
    destination: form.destination.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    dayCount: form.dayCount || computeTripDayCount(form.startDate, form.endDate),
    estimatedHeadcount: form.estimatedHeadcount,
    totalBudget: form.totalBudget,
    knownRequirements: form.knownRequirements.trim() || undefined,
    primaryContact: serializeStakeholder(form.primaryContact),
    payer: form.payerSameAsPrimary
      ? form.primaryContact.name.trim()
      : serializeStakeholder(payerContact),
    finalConfirmer: serializeStakeholder(form.finalConfirmer),
    advisor: serializeStakeholder(form.advisor),
    leader: serializeStakeholder(form.leader),
    organizationId: form.organizationId,
  };
}

export type AdvisorTripCreateStepId = 'basic' | 'roles' | 'budget' | 'invite';

export function validateAdvisorTripStep(
  step: AdvisorTripCreateStepId,
  form: AdvisorTripCreateFormState,
): string | null {
  if (step === 'basic') {
    if (!form.destination.trim()) return '请填写目的地';
    if (!form.startDate) return '请选择出发日期';
    if (!form.endDate) return '请选择返回日期';
    const days = computeTripDayCount(form.startDate, form.endDate);
    if (days <= 0) return '返回日期须不早于出发日期';
    if (form.estimatedHeadcount < 1) return '预计人数至少为 1';
    return null;
  }

  if (step === 'roles') {
    if (!form.primaryContact.name.trim()) return '请填写主联系人姓名';
    if (!form.payerSameAsPrimary && !form.payer.name.trim()) return '请填写付款人姓名';
    if (!form.finalConfirmer.name.trim()) return '请填写最终确认人姓名';
    if (!form.advisor.name.trim()) return '请指定顾问';
    if (!form.leader.name.trim()) return '请指定领队';
    return null;
  }

  if (step === 'budget') {
    if (form.totalBudget <= 0) return '请填写初步预算（大于 0）';
    return null;
  }

  return null;
}

export function normalizeOrganizationStaff(raw: unknown): OrganizationStaffOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      const userId = String(row.userId ?? row.id ?? '').trim();
      if (!userId) return null;
      const displayName = String(
        row.displayName ?? row.name ?? row.email ?? userId,
      ).trim();
      const rolesRaw = row.roles ?? row.role;
      const roles = Array.isArray(rolesRaw)
        ? rolesRaw.map((r) => String(r))
        : rolesRaw
          ? [String(rolesRaw)]
          : [];
      return { userId, displayName, roles };
    })
    .filter((item): item is OrganizationStaffOption => item != null);
}

export function filterStaffByRoles(
  staff: OrganizationStaffOption[],
  roles: string[],
): OrganizationStaffOption[] {
  const allowed = new Set(roles.map((r) => r.toUpperCase()));
  return staff.filter((member) =>
    member.roles.some((r) => allowed.has(r.toUpperCase())),
  );
}

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code.toLowerCase();
}

export function buildAdvisorTripInviteUrl(inviteCode: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/invite/${inviteCode}`;
  }
  return `/invite/${inviteCode}`;
}

/** DEV 降级：按无 userId 的干系人生成角色邀请码（与后端行为一致） */
export function buildMockRoleInviteCodes(
  form: AdvisorTripCreateFormState,
): AdvisorTripMemberInviteCode[] {
  const roles: Array<{ key: keyof typeof ROLE_INVITE_LABELS; contact: AdvisorTripContactForm }> = [
    { key: 'primaryContact', contact: form.primaryContact },
    {
      key: 'payer',
      contact: form.payerSameAsPrimary ? form.primaryContact : form.payer,
    },
    { key: 'finalConfirmer', contact: form.finalConfirmer },
    { key: 'advisor', contact: form.advisor },
    { key: 'leader', contact: form.leader },
  ];

  return roles
    .filter(({ contact }) => !contact.userId?.trim())
    .map(({ key }) => {
      const inviteCode = randomInviteCode();
      return {
        inviteCode,
        inviteUrl: buildAdvisorTripInviteUrl(inviteCode),
        label: ROLE_INVITE_LABELS[key] ?? key,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });
}

export function formatContactSummary(contact: AdvisorTripContactForm): string {
  const parts = [contact.name.trim()];
  const email = trimOptional(contact.email);
  const phone = trimOptional(contact.phone);
  if (email) parts.push(email);
  if (phone) parts.push(phone);
  if (contact.userId) parts.push('(已绑定账号)');
  return parts.filter(Boolean).join(' · ');
}
