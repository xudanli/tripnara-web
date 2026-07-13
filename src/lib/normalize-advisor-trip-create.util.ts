import { buildAdvisorTripInviteUrl } from '@/lib/advisor-trip-create.util';
import { normalizeTripResponsibilityOwners } from '@/lib/trip-responsibility.util';
import { rewriteJoinTripInviteUrl } from '@/lib/normalize-invite-resolver.util';
import type {
  AdvisorTripMemberInviteCode,
  CreateAdvisorTripResponse,
} from '@/types/advisor-trip-create';

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function normalizeMemberInviteCode(raw: unknown): AdvisorTripMemberInviteCode | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const inviteCode = pickString(o, 'inviteCode', 'invite_code', 'code');
  if (!inviteCode) return null;
  const label = pickString(o, 'label') ?? '成员';
  const inviteUrlRaw = pickString(o, 'inviteUrl', 'invite_url');
  const inviteUrl =
    inviteUrlRaw != null
      ? rewriteJoinTripInviteUrl(inviteUrlRaw, inviteCode)
      : buildAdvisorTripInviteUrl(inviteCode);
  const expiresAt = pickString(o, 'expiresAt', 'expires_at');
  return {
    inviteCode,
    inviteUrl,
    label,
    expiresAt,
  };
}

/** 归一化 advisor-create 响应（含 responsibilityOwners、/invite/ URL） */
export function normalizeCreateAdvisorTripResponse(raw: unknown): CreateAdvisorTripResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const tripId = pickString(o, 'tripId', 'trip_id') ?? '';
  const message = pickString(o, 'message');

  const codesRaw = o.memberInviteCodes ?? o.member_invite_codes;
  const memberInviteCodes = Array.isArray(codesRaw)
    ? codesRaw
        .map(normalizeMemberInviteCode)
        .filter((item): item is AdvisorTripMemberInviteCode => item != null)
    : [];

  const ownersRaw = o.responsibilityOwners ?? o.responsibility_owners;
  const responsibilityOwners =
    ownersRaw != null ? normalizeTripResponsibilityOwners({ owners: ownersRaw }) : undefined;

  return {
    tripId,
    memberInviteCodes,
    message,
    responsibilityOwners,
  };
}

/** 从行程 metadata 读取顾问制角色邀请码（创建时写入 memberInviteCodes） */
export function readTripMemberInviteCodes(
  metadata: Record<string, unknown> | null | undefined,
): AdvisorTripMemberInviteCode[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const codesRaw = metadata.memberInviteCodes ?? metadata.member_invite_codes;
  if (!Array.isArray(codesRaw)) return [];
  return codesRaw
    .map(normalizeMemberInviteCode)
    .filter((item): item is AdvisorTripMemberInviteCode => item != null);
}
