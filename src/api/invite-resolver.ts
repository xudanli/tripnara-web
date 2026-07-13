/**
 * 统一邀请解析
 * GET /invites/:token/resolve（优先）
 * 未命中 NOT_FOUND 时降级：trip_member → team → gate1_participant
 */

import apiClient from './client';
import { teamApi } from './optimization-v2';
import { participantPortalApi } from './participant-portal';
import { tripMemberInvitesApi } from './trip-member-invites';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import { participantInvitePath } from '@/features/participant-portal/shell/participant-phase';
import {
  defaultTargetPathForKind,
  isInviteResolveNotFound,
  normalizeResolvedInvite,
} from '@/lib/normalize-invite-resolver.util';
import { roleSlotLabel } from '@/lib/trip-member-roles.util';
import type { ResolvedInvite } from '@/types/invite-resolver';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { code?: string; message?: string };
}

type ResolveApiResponse = SuccessResponse<unknown> | ErrorResponse;

function inviteLandingPath(token: string): string {
  return defaultTargetPathForKind('trip_member', token);
}

async function resolveViaUnifiedEndpoint(
  token: string,
): Promise<ResolvedInvite | 'not_found' | null> {
  try {
    const response = await apiClient.get<ResolveApiResponse>(
      `/invites/${encodeURIComponent(token)}/resolve`,
    );
    const payload = response.data;
    if (isInviteResolveNotFound(payload)) return 'not_found';
    if (payload && 'success' in payload && payload.success) {
      return normalizeResolvedInvite(payload.data, token);
    }
    return 'not_found';
  } catch (error) {
    const err = error as { response?: { data?: unknown; status?: number } };
    if (err.response?.data && isInviteResolveNotFound(err.response.data)) {
      return 'not_found';
    }
    if (isApiNotReadyError(error)) return null;
    return null;
  }
}

async function resolveTripMemberInvite(token: string): Promise<ResolvedInvite | null> {
  try {
    const ctx = await tripMemberInvitesApi.getContext(token);
    const roleLabel = roleSlotLabel(ctx.roleSlot) ?? ctx.label;
    return {
      kind: 'trip_member',
      token,
      targetPath: inviteLandingPath(token),
      preview: {
        title: ctx.tripName ?? '加入行程',
        destination: ctx.destination,
        tripId: ctx.tripId,
        label: roleLabel ?? ctx.label,
        subtitle: roleLabel ? `邀请角色：${roleLabel}` : undefined,
        expired: ctx.expired,
      },
    };
  } catch {
    return null;
  }
}

async function resolveTeamInvite(token: string): Promise<ResolvedInvite | null> {
  try {
    const info = await teamApi.getInviteInfo(token);
    return {
      kind: 'team',
      token,
      targetPath: inviteLandingPath(token),
      preview: {
        title: info.teamName ?? '加入团队',
        tripId: info.tripId,
      },
    };
  } catch {
    return null;
  }
}

async function resolveGate1Invite(token: string): Promise<ResolvedInvite | null> {
  try {
    await participantPortalApi.getInvite(token);
    return {
      kind: 'gate1_participant',
      token,
      targetPath: participantInvitePath(token),
      preview: { title: '项目邀请' },
    };
  } catch {
    return null;
  }
}

export const inviteResolverApi = {
  resolve: async (token: string): Promise<ResolvedInvite> => {
    const unified = await resolveViaUnifiedEndpoint(token);
    if (unified && unified !== 'not_found') return unified;

    const trip = await resolveTripMemberInvite(token);
    if (trip) return trip;

    const team = await resolveTeamInvite(token);
    if (team) return team;

    const gate1 = await resolveGate1Invite(token);
    if (gate1) return gate1;

    throw new Error('邀请链接无效或已过期');
  },

  /** 仅解析 trip_member（不抛错） */
  tryTripMember: resolveTripMemberInvite,
};

export function isInviteResolveSoftError(error: unknown): boolean {
  return isApiNotReadyError(error);
}
