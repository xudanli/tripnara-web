import { normalizeMemberOnboardingDraft } from '@/lib/normalize-trip-member-invite.util';
import type {
  MemberOnboardingProfile,
  MemberOnboardingProfilesResponse,
  TeamRequirementInfoGapReason,
  TeamRequirementPendingMember,
} from '@/types/team-requirement-profile';

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

const VALID_GAP_REASONS: TeamRequirementInfoGapReason[] = [
  'onboarding_not_started',
  'onboarding_in_progress',
  'onboarding_not_submitted',
];

function normalizeGapReason(raw: unknown): TeamRequirementInfoGapReason {
  if (typeof raw === 'string' && (VALID_GAP_REASONS as string[]).includes(raw)) {
    return raw as TeamRequirementInfoGapReason;
  }
  return 'onboarding_not_submitted';
}

export function normalizeMemberOnboardingProfile(raw: unknown): MemberOnboardingProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const userId = pickString(o, 'userId', 'user_id');
  if (!userId) return null;

  const draft = normalizeMemberOnboardingDraft(raw, pickString(o, 'inviteToken', 'invite_token') ?? userId);
  if (!draft) return null;

  return {
    ...draft,
    userId,
    memberId: pickString(o, 'memberId', 'member_id'),
    /** 后端永不返回 privateNotes 原文 */
    privateNotes: '',
    advisorVisiblePrivateNotes:
      pickString(o, 'advisorVisiblePrivateNotes', 'advisor_visible_private_notes') ?? null,
  };
}

function normalizePendingMember(raw: unknown): TeamRequirementPendingMember | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const userId = pickString(o, 'userId', 'user_id');
  if (!userId) return null;
  return {
    userId,
    displayName: pickString(o, 'displayName', 'display_name') ?? '成员',
    role: pickString(o, 'role'),
    reason: normalizeGapReason(o.reason),
  };
}

/** 兼容 profiles 数组或 Record<userId, profile> */
function normalizeProfilesList(raw: unknown): MemberOnboardingProfile[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(normalizeMemberOnboardingProfile).filter((p): p is MemberOnboardingProfile => p != null);
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .map(([userId, value]) => {
        const base =
          value && typeof value === 'object'
            ? { ...(value as Record<string, unknown>), userId }
            : { userId };
        return normalizeMemberOnboardingProfile(base);
      })
      .filter((p): p is MemberOnboardingProfile => p != null);
  }
  return [];
}

/** 双写响应中优先取非空数组 */
function pickArrayField(...candidates: unknown[]): unknown[] | undefined {
  for (const raw of candidates) {
    if (Array.isArray(raw) && raw.length > 0) return raw;
  }
  for (const raw of candidates) {
    if (Array.isArray(raw)) return raw;
  }
  return undefined;
}

export function normalizeMemberOnboardingProfilesResponse(
  raw: unknown,
  tripId: string,
): MemberOnboardingProfilesResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const profilesRaw = o.profiles ?? o.memberOnboardingProfiles ?? o.member_onboarding_profiles;
  const pendingRaw = pickArrayField(o.pendingMembers, o.pending_members);

  return {
    tripId: pickString(o, 'tripId', 'trip_id') ?? tripId,
    profiles: normalizeProfilesList(profilesRaw),
    pendingMembers: Array.isArray(pendingRaw)
      ? pendingRaw.map(normalizePendingMember).filter((p): p is TeamRequirementPendingMember => p != null)
      : undefined,
    generatedAt: pickString(o, 'generatedAt', 'generated_at'),
  };
}
