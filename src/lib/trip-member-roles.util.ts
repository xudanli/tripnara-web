import type { MemberTripRole, TripMemberRoleSlot } from '@/types/member-onboarding';
import type { ParticipantRole } from '@/types/participant-portal';
import type { UnifiedTripMemberRole } from '@/types/trip-member-role';
import { UNIFIED_ROLE_LABELS } from '@/types/trip-member-role';

const PORTAL_ROLE_MAP: Record<ParticipantRole, UnifiedTripMemberRole> = {
  PARTICIPANT: 'MEMBER',
  ORGANIZER: 'ORGANIZER',
  DECISION_MAKER: 'FINAL_CONFIRMER',
  PAYER: 'PAYER',
  GUARDIAN: 'GUARDIAN',
};

const ONBOARDING_ROLE_MAP: Record<MemberTripRole, UnifiedTripMemberRole> = {
  MEMBER: 'MEMBER',
  PAYER: 'PAYER',
  FINAL_CONFIRMER: 'FINAL_CONFIRMER',
  GUARDIAN: 'GUARDIAN',
  PRIMARY_CONTACT: 'PRIMARY_CONTACT',
};

const TEAM_ROLE_MAP: Record<string, UnifiedTripMemberRole> = {
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
  OBSERVER: 'OBSERVER',
};

const INVITE_LABEL_MAP: Record<string, UnifiedTripMemberRole> = {
  顾问: 'ADVISOR',
  领队: 'LEADER',
  付款人: 'PAYER',
  最终确认人: 'FINAL_CONFIRMER',
  主联系人: 'PRIMARY_CONTACT',
  现场领队: 'LEADER',
};

const ORG_ROLE_MAP: Record<string, UnifiedTripMemberRole> = {
  ADVISOR: 'ADVISOR',
  LEADER: 'LEADER',
  AGENCY_ADMIN: 'ADVISOR',
  OWNER: 'ADVISOR',
  OPERATIONS: 'MEMBER',
};

const ROLE_SLOT_MAP: Record<string, UnifiedTripMemberRole> = {
  PAYER: 'PAYER',
  PRIMARY_CONTACT: 'PRIMARY_CONTACT',
  FINAL_CONFIRMER: 'FINAL_CONFIRMER',
  ADVISOR: 'ADVISOR',
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
  GUARDIAN: 'GUARDIAN',
};

export function normalizeRoleSlot(slot: TripMemberRoleSlot | string | undefined): UnifiedTripMemberRole | undefined {
  if (!slot?.trim()) return undefined;
  const upper = slot.trim().toUpperCase();
  if (ROLE_SLOT_MAP[upper]) return ROLE_SLOT_MAP[upper];
  return normalizeInviteLabel(slot);
}

/** invite.roleSlot → onboarding 表单默认 tripRole */
export function roleSlotToMemberTripRole(slot: TripMemberRoleSlot | string | undefined): MemberTripRole {
  const upper = slot?.trim().toUpperCase();
  switch (upper) {
    case 'PAYER':
      return 'PAYER';
    case 'PRIMARY_CONTACT':
      return 'PRIMARY_CONTACT';
    case 'FINAL_CONFIRMER':
      return 'FINAL_CONFIRMER';
    case 'GUARDIAN':
      return 'GUARDIAN';
    default:
      return 'MEMBER';
  }
}

export function roleSlotLabel(slot: TripMemberRoleSlot | string | undefined): string | undefined {
  const unified = normalizeRoleSlot(slot);
  return unified ? unifiedRoleLabel(unified) : undefined;
}

export function normalizeParticipantRole(role: ParticipantRole): UnifiedTripMemberRole {
  return PORTAL_ROLE_MAP[role] ?? 'MEMBER';
}

export function normalizeOnboardingRole(role: MemberTripRole): UnifiedTripMemberRole {
  return ONBOARDING_ROLE_MAP[role] ?? 'MEMBER';
}

export function normalizeTeamRole(role: string): UnifiedTripMemberRole {
  return TEAM_ROLE_MAP[role.toUpperCase()] ?? 'MEMBER';
}

export function normalizeInviteLabel(label: string | undefined): UnifiedTripMemberRole | undefined {
  if (!label?.trim()) return undefined;
  const trimmed = label.trim();
  if (INVITE_LABEL_MAP[trimmed]) return INVITE_LABEL_MAP[trimmed];
  const upper = trimmed.toUpperCase();
  if (upper in UNIFIED_ROLE_LABELS) return upper as UnifiedTripMemberRole;
  return undefined;
}

export function normalizeOrganizationRole(role: string): UnifiedTripMemberRole {
  return ORG_ROLE_MAP[role.toUpperCase()] ?? 'MEMBER';
}

export function unifiedRoleLabel(role: UnifiedTripMemberRole): string {
  return UNIFIED_ROLE_LABELS[role] ?? role;
}

/** 责任分配 role key → 统一角色 */
export function responsibilityKeyToUnifiedRole(
  key: string,
): UnifiedTripMemberRole | undefined {
  const map: Record<string, UnifiedTripMemberRole> = {
    planningOwner: 'ADVISOR',
    executionOwner: 'LEADER',
    paymentApprover: 'PAYER',
    finalApprover: 'FINAL_CONFIRMER',
    onTripLeader: 'LEADER',
    emergencyContact: 'PRIMARY_CONTACT',
  };
  return map[key];
}
