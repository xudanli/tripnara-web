import type {
  AcceptTripMemberInviteResponse,
  MemberOnboardingDraft,
  TripMemberInviteContext,
  TripMemberRoleSlot,
} from '@/types/member-onboarding';

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

export function normalizeTripMemberInviteContext(raw: unknown): TripMemberInviteContext {
  const o = (raw ?? {}) as Record<string, unknown>;
  const inviteCode =
    pickString(o, 'inviteCode', 'invite_code', 'code') ?? '';
  const tripId = pickString(o, 'tripId', 'trip_id') ?? '';
  const roleSlot = pickString(o, 'roleSlot', 'role_slot') as TripMemberRoleSlot | undefined;

  return {
    inviteCode,
    tripId,
    label: pickString(o, 'label'),
    roleSlot,
    tripName: pickString(o, 'tripName', 'trip_name', 'name'),
    destination: pickString(o, 'destination'),
    roleHint: pickString(o, 'roleHint', 'role_hint'),
    expired: pickBool(o, 'expired'),
    accepted: pickBool(o, 'accepted'),
    onboardingRequired: pickBool(o, 'onboardingRequired', 'onboarding_required') ?? true,
    onboardingCompleted: pickBool(o, 'onboardingCompleted', 'onboarding_completed') ?? false,
  };
}

export function normalizeAcceptTripMemberInviteResponse(
  raw: unknown,
): AcceptTripMemberInviteResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    tripId: pickString(o, 'tripId', 'trip_id') ?? '',
    memberId: pickString(o, 'memberId', 'member_id', 'collaboratorId', 'collaborator_id'),
    collaboratorId: pickString(o, 'collaboratorId', 'collaborator_id'),
    roleSlot: pickString(o, 'roleSlot', 'role_slot') as TripMemberRoleSlot | undefined,
    alreadyAccepted: pickBool(o, 'alreadyAccepted', 'already_accepted'),
  };
}

export function normalizeMemberOnboardingDraft(raw: unknown, fallbackCode: string): MemberOnboardingDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const inviteToken = pickString(o, 'inviteToken', 'invite_token') ?? fallbackCode;
  if (!inviteToken) return null;

  const coreWishesRaw = o.coreWishes ?? o.core_wishes;
  const coreWishes = Array.isArray(coreWishesRaw)
    ? coreWishesRaw.map(String)
    : ['', '', ''];

  return {
    inviteToken,
    tripId: pickString(o, 'tripId', 'trip_id'),
    roleSlot: pickString(o, 'roleSlot', 'role_slot') as TripMemberRoleSlot | undefined,
    displayName: pickString(o, 'displayName', 'display_name') ?? '',
    tripRole: (pickString(o, 'tripRole', 'trip_role') ?? 'MEMBER') as MemberOnboardingDraft['tripRole'],
    guardianFor: pickString(o, 'guardianFor', 'guardian_for'),
    coreWishes: coreWishes.length >= 3 ? coreWishes.slice(0, 3) : [...coreWishes, '', ''].slice(0, 3),
    mustExperience: pickString(o, 'mustExperience', 'must_experience') ?? '',
    avoidExperience: pickString(o, 'avoidExperience', 'avoid_experience') ?? '',
    pacePreference:
      (pickString(o, 'pacePreference', 'pace_preference') as MemberOnboardingDraft['pacePreference']) ??
      'moderate',
    earlyRiser: pickBool(o, 'earlyRiser', 'early_riser') ?? false,
    maxDailyWalkKm:
      typeof o.maxDailyWalkKm === 'number'
        ? o.maxDailyWalkKm
        : typeof o.max_daily_walk_km === 'number'
          ? o.max_daily_walk_km
          : undefined,
    lodgingPreference: pickString(o, 'lodgingPreference', 'lodging_preference') ?? '',
    dietRestrictions: pickString(o, 'dietRestrictions', 'diet_restrictions') ?? '',
    healthNotes: pickString(o, 'healthNotes', 'health_notes') ?? '',
    personalSpendingLevel:
      (pickString(o, 'personalSpendingLevel', 'personal_spending_level') as MemberOnboardingDraft['personalSpendingLevel']) ??
      'moderate',
    personalSpendingNotes: pickString(o, 'personalSpendingNotes', 'personal_spending_notes') ?? '',
    acceptSplitGroup:
      (pickString(o, 'acceptSplitGroup', 'accept_split_group') as MemberOnboardingDraft['acceptSplitGroup']) ??
      'depends',
    splitGroupNotes: pickString(o, 'splitGroupNotes', 'split_group_notes') ?? '',
    privateNotes: pickString(o, 'privateNotes', 'private_notes') ?? '',
    privateNotesAuth:
      (pickString(o, 'privateNotesAuth', 'private_notes_auth') as MemberOnboardingDraft['privateNotesAuth']) ??
      'SANITIZED_TO_ADVISOR',
    currentStepId: pickString(o, 'currentStepId', 'current_step_id') as MemberOnboardingDraft['currentStepId'],
    completedAt: pickString(o, 'completedAt', 'completed_at'),
    updatedAt: pickString(o, 'updatedAt', 'updated_at'),
  };
}

export function normalizeMemberOnboardingSubmitResponse(
  raw: unknown,
  code: string,
): import('@/types/member-onboarding').MemberOnboardingSubmitResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    tripId: pickString(o, 'tripId', 'trip_id') ?? '',
    memberId: pickString(o, 'memberId', 'member_id'),
    status: 'SUBMITTED',
    homePath:
      pickString(o, 'homePath', 'home_path') ?? `/member/${encodeURIComponent(code)}/home`,
  };
}
