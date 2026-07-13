import type { AdvisorTripContactForm, AdvisorTripCreateFormState } from '@/types/advisor-trip-create';
import type {
  TripMemberRef,
  TripResponsibilityOwners,
  TripResponsibilityRoleKey,
} from '@/types/trip-responsibility';

function contactToMemberRef(
  contact: AdvisorTripContactForm,
  inviteLabel?: string,
): TripMemberRef {
  const ref: TripMemberRef = {};
  const name = contact.name?.trim();
  const email = contact.email?.trim();
  const phone = contact.phone?.trim();
  const userId = contact.userId?.trim();
  if (name) ref.name = name;
  if (email) ref.email = email;
  if (phone) ref.phone = phone;
  if (userId) ref.userId = userId;
  if (inviteLabel) ref.inviteLabel = inviteLabel;
  return ref;
}

/** 顾问创建表单 → 责任分配 SSOT */
export function buildResponsibilityOwnersFromAdvisorForm(
  form: AdvisorTripCreateFormState,
): TripResponsibilityOwners {
  const payerContact = form.payerSameAsPrimary ? form.primaryContact : form.payer;
  return {
    planningOwner: contactToMemberRef(form.advisor, '顾问'),
    executionOwner: contactToMemberRef(form.leader, '领队'),
    paymentApprover: contactToMemberRef(payerContact, '付款人'),
    finalApprover: contactToMemberRef(form.finalConfirmer, '最终确认人'),
    onTripLeader: contactToMemberRef(form.leader, '现场领队'),
    emergencyContact: contactToMemberRef(form.primaryContact, '主联系人'),
  };
}

export function formatTripMemberRef(ref: TripMemberRef | undefined | null): string {
  if (!ref) return '—';
  const parts: string[] = [];
  if (ref.name) parts.push(ref.name);
  if (ref.email) parts.push(ref.email);
  if (ref.phone) parts.push(ref.phone);
  if (ref.userId && !ref.name) parts.push('已绑定账号');
  if (ref.inviteLabel && parts.length === 0) parts.push(`待邀请（${ref.inviteLabel}）`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function tripResponsibilityOwnerEntries(
  owners: TripResponsibilityOwners,
): Array<{ key: TripResponsibilityRoleKey; ref: TripMemberRef }> {
  return (
    Object.keys(owners) as TripResponsibilityRoleKey[]
  ).map((key) => ({ key, ref: owners[key] }));
}

export function mergeResponsibilityOwners(
  base: TripResponsibilityOwners,
  patch: Partial<TripResponsibilityOwners>,
): TripResponsibilityOwners {
  return {
    planningOwner: { ...base.planningOwner, ...patch.planningOwner },
    executionOwner: { ...base.executionOwner, ...patch.executionOwner },
    paymentApprover: { ...base.paymentApprover, ...patch.paymentApprover },
    finalApprover: { ...base.finalApprover, ...patch.finalApprover },
    onTripLeader: { ...base.onTripLeader, ...patch.onTripLeader },
    emergencyContact: { ...base.emergencyContact, ...patch.emergencyContact },
  };
}

function pickMemberRefField(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeMemberRef(raw: unknown): TripMemberRef {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const ref: TripMemberRef = {};
  const memberId = pickMemberRefField(o, 'memberId', 'member_id');
  const userId = pickMemberRefField(o, 'userId', 'user_id');
  const name = pickMemberRefField(o, 'name');
  const email = pickMemberRefField(o, 'email');
  const phone = pickMemberRefField(o, 'phone');
  const inviteLabel = pickMemberRefField(o, 'inviteLabel', 'invite_label');
  if (memberId) ref.memberId = memberId;
  if (userId) ref.userId = userId;
  if (name) ref.name = name;
  if (email) ref.email = email;
  if (phone) ref.phone = phone;
  if (inviteLabel) ref.inviteLabel = inviteLabel;
  return ref;
}

const RESPONSIBILITY_ROLE_KEYS: TripResponsibilityRoleKey[] = [
  'planningOwner',
  'executionOwner',
  'paymentApprover',
  'finalApprover',
  'onTripLeader',
  'emergencyContact',
];

export function normalizeTripResponsibilityOwners(raw: unknown): TripResponsibilityOwners {
  const o = (raw ?? {}) as Record<string, unknown>;
  const ownersRaw = (o.owners ?? o) as Record<string, unknown>;
  const empty: TripResponsibilityOwners = {
    planningOwner: {},
    executionOwner: {},
    paymentApprover: {},
    finalApprover: {},
    onTripLeader: {},
    emergencyContact: {},
  };
  return RESPONSIBILITY_ROLE_KEYS.reduce((acc, key) => {
    const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    acc[key] = normalizeMemberRef(ownersRaw[key] ?? ownersRaw[snake]);
    return acc;
  }, empty);
}

export function normalizeTripResponsibilityOwnersResponse(
  raw: unknown,
  fallbackTripId: string,
): import('@/types/trip-responsibility').TripResponsibilityOwnersResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const tripId =
    pickMemberRefField(o, 'tripId', 'trip_id') ?? fallbackTripId;
  const updatedAt = pickMemberRefField(o, 'updatedAt', 'updated_at');
  const inferred =
    typeof o.inferred === 'boolean'
      ? o.inferred
      : typeof o.is_inferred === 'boolean'
        ? o.is_inferred
        : undefined;
  return {
    tripId,
    owners: normalizeTripResponsibilityOwners(raw),
    updatedAt,
    inferred,
  };
}

/** 顾问创建后写入责任分配：优先响应 owners，否则 GET 推导，最后 PATCH */
export async function persistResponsibilityOwnersAfterAdvisorCreate(
  tripId: string,
  form: AdvisorTripCreateFormState,
  responseOwners?: TripResponsibilityOwners,
): Promise<TripResponsibilityOwners> {
  const { tripResponsibilityApi } = await import('@/api/trip-responsibility');

  if (responseOwners) {
    tripResponsibilityApi.seedLocal(tripId, responseOwners);
    return responseOwners;
  }

  const existing = await tripResponsibilityApi.get(tripId);
  if (existing?.owners) {
    tripResponsibilityApi.seedLocal(tripId, existing.owners);
    return existing.owners;
  }

  const owners = buildResponsibilityOwnersFromAdvisorForm(form);
  try {
    const patched = await tripResponsibilityApi.patch(tripId, { owners });
    return patched.owners;
  } catch {
    tripResponsibilityApi.seedLocal(tripId, owners);
    return owners;
  }
}
