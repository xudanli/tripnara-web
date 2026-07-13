/**
 * 行程成员邀请（trip_member_invites）
 * GET/POST accept · GET/PUT onboarding · POST submit
 * POST /trips/:tripId/member-invites — 规划中生成同行成员邀请
 */

import apiClient from './client';
import { tripsApi } from './trips';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import {
  normalizeAcceptTripMemberInviteResponse,
  normalizeMemberOnboardingDraft,
  normalizeMemberOnboardingSubmitResponse,
  normalizeTripMemberInviteContext,
} from '@/lib/normalize-trip-member-invite.util';
import {
  createEmptyMemberOnboardingDraft,
  readMemberOnboardingDraft,
  writeMemberOnboardingDraft,
} from '@/lib/member-onboarding-storage';
import { buildAdvisorTripInviteUrl } from '@/lib/advisor-trip-create.util';
import { normalizeMemberInviteCode } from '@/lib/normalize-advisor-trip-create.util';
import {
  appendLocalTripMemberInviteCodes,
  buildGenericMemberInviteCodes,
  mergeInviteCodeLists,
  resolveTripMemberInviteCodes,
} from '@/lib/trip-member-invite-codes.util';
import type { AdvisorTripMemberInviteCode } from '@/types/advisor-trip-create';
import type {
  AcceptTripMemberInviteResponse,
  MemberOnboardingDraft,
  MemberOnboardingSubmitResponse,
  TripMemberInviteContext,
} from '@/types/member-onboarding';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { message?: string; code?: string };
}

type ApiWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiWrapper<T> }): T {
  if (!response?.data?.success) {
    const err = response.data as ErrorResponse;
    throw new Error(err.error?.message ?? '请求失败');
  }
  return response.data.data;
}

export interface CreateTripMemberInvitesRequest {
  /** 生成数量，默认 1 */
  count?: number;
  /** 标签前缀，默认「同行成员」 */
  labelPrefix?: string;
}

export interface CreateTripMemberInvitesResponse {
  tripId: string;
  memberInviteCodes: AdvisorTripMemberInviteCode[];
  /** 本次新增 */
  created: AdvisorTripMemberInviteCode[];
}

function normalizeCreateInvitesResponse(raw: unknown, tripId: string): CreateTripMemberInvitesResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const codesRaw = o.memberInviteCodes ?? o.member_invite_codes ?? o.created ?? o.invites;
  const list = Array.isArray(codesRaw)
    ? codesRaw
        .map(normalizeMemberInviteCode)
        .filter((item): item is AdvisorTripMemberInviteCode => item != null)
    : [];
  return {
    tripId: typeof o.tripId === 'string' ? o.tripId : tripId,
    memberInviteCodes: list,
    created: list,
  };
}

async function createInvitesViaMetadataFallback(
  tripId: string,
  request: CreateTripMemberInvitesRequest,
): Promise<CreateTripMemberInvitesResponse> {
  const existing = resolveTripMemberInviteCodes(tripId, null);
  const created = buildGenericMemberInviteCodes({
    count: request.count ?? 1,
    labelPrefix: request.labelPrefix,
    existingCount: existing.length,
  });

  appendLocalTripMemberInviteCodes(tripId, created);

  try {
    const trip = await tripsApi.getById(tripId);
    const meta = ((trip as { metadata?: Record<string, unknown> | null }).metadata ?? {}) as Record<
      string,
      unknown
    >;
    const fromMeta = Array.isArray(meta.memberInviteCodes)
      ? (meta.memberInviteCodes as unknown[])
          .map(normalizeMemberInviteCode)
          .filter((item): item is AdvisorTripMemberInviteCode => item != null)
      : [];
    const merged = mergeInviteCodeLists(fromMeta, existing, created);
    await tripsApi.update(tripId, {
      metadata: {
        ...meta,
        memberInviteCodes: merged,
      },
    });
    return { tripId, memberInviteCodes: merged, created };
  } catch {
    const merged = mergeInviteCodeLists(existing, created);
    return { tripId, memberInviteCodes: merged, created };
  }
}

export const tripMemberInvitesApi = {
  /** GET /trips/member-invites/:code — 公开预览 */
  getContext: async (code: string): Promise<TripMemberInviteContext> => {
    try {
      const response = await apiClient.get<ApiWrapper<unknown>>(
        `/trips/member-invites/${encodeURIComponent(code)}`,
      );
      return normalizeTripMemberInviteContext(handleResponse(response));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return normalizeTripMemberInviteContext({
          inviteCode: code,
          tripId: 'mock-trip',
          tripName: '示例行程',
          destination: 'IS',
          label: '成员',
          roleSlot: 'MEMBER',
          onboardingRequired: true,
          onboardingCompleted: false,
        });
      }
      throw error;
    }
  },

  /**
   * POST /trips/member-invites/:code/accept — 登录
   * 绑定 tripCollaborator（role 来自 invite.roleSlot），同步 projectMembership
   */
  accept: async (code: string): Promise<AcceptTripMemberInviteResponse> => {
    try {
      const response = await apiClient.post<ApiWrapper<unknown>>(
        `/trips/member-invites/${encodeURIComponent(code)}/accept`,
        {},
      );
      return normalizeAcceptTripMemberInviteResponse(handleResponse(response));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return normalizeAcceptTripMemberInviteResponse({ tripId: 'mock-trip', roleSlot: 'MEMBER' });
      }
      throw error;
    }
  },

  /** GET /trips/member-invites/:code/onboarding — 登录 */
  getOnboarding: async (code: string): Promise<MemberOnboardingDraft | null> => {
    try {
      const response = await apiClient.get<ApiWrapper<unknown>>(
        `/trips/member-invites/${encodeURIComponent(code)}/onboarding`,
      );
      const raw = handleResponse(response);
      if (raw == null) return null;
      return normalizeMemberOnboardingDraft(raw, code);
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return readMemberOnboardingDraft(code) ?? createEmptyMemberOnboardingDraft(code);
      }
      throw error;
    }
  },

  /** PUT /trips/member-invites/:code/onboarding — 登录草稿保存 */
  saveOnboarding: async (code: string, draft: MemberOnboardingDraft): Promise<MemberOnboardingDraft> => {
    try {
      const response = await apiClient.put<ApiWrapper<unknown>>(
        `/trips/member-invites/${encodeURIComponent(code)}/onboarding`,
        draft,
      );
      const saved = normalizeMemberOnboardingDraft(handleResponse(response), code);
      return saved ?? draft;
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        writeMemberOnboardingDraft(draft);
        return draft;
      }
      writeMemberOnboardingDraft(draft);
      throw error;
    }
  },

  /**
   * POST /trips/member-invites/:code/onboarding/submit — 登录
   * 写入 trip.metadata.memberOnboardingProfiles[userId]；返回 homePath
   */
  submitOnboarding: async (
    code: string,
    draft: MemberOnboardingDraft,
  ): Promise<MemberOnboardingSubmitResponse> => {
    try {
      const response = await apiClient.post<ApiWrapper<unknown>>(
        `/trips/member-invites/${encodeURIComponent(code)}/onboarding/submit`,
        draft,
      );
      return normalizeMemberOnboardingSubmitResponse(handleResponse(response), code);
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        writeMemberOnboardingDraft({ ...draft, completedAt: new Date().toISOString() });
        return normalizeMemberOnboardingSubmitResponse(
          {
            tripId: draft.tripId ?? 'mock-trip',
            status: 'SUBMITTED',
            homePath: `/member/${encodeURIComponent(code)}/home`,
          },
          code,
        );
      }
      throw error;
    }
  },

  /**
   * POST /trips/:tripId/member-invites — 规划中生成同行成员邀请（一人一链）
   * 后端未就绪时：本地生成 + 尝试写入 trip.metadata.memberInviteCodes
   */
  createForTrip: async (
    tripId: string,
    request: CreateTripMemberInvitesRequest = {},
  ): Promise<CreateTripMemberInvitesResponse> => {
    try {
      const response = await apiClient.post<ApiWrapper<unknown>>(
        `/trips/${encodeURIComponent(tripId)}/member-invites`,
        {
          count: request.count ?? 1,
          labelPrefix: request.labelPrefix ?? '同行成员',
          roleSlot: 'MEMBER',
        },
      );
      const normalized = normalizeCreateInvitesResponse(handleResponse(response), tripId);
      if (normalized.created.length > 0) {
        appendLocalTripMemberInviteCodes(tripId, normalized.created);
      }
      return normalized;
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return createInvitesViaMetadataFallback(tripId, request);
      }
      throw error;
    }
  },

  /** 读取某行程当前可用邀请码（metadata ∪ 本地缓存） */
  listForTrip: (
    tripId: string,
    metadata: Record<string, unknown> | null | undefined,
  ): AdvisorTripMemberInviteCode[] => resolveTripMemberInviteCodes(tripId, metadata),

  buildInviteUrl: buildAdvisorTripInviteUrl,
};

export type { TripMemberInviteContext, AcceptTripMemberInviteResponse };
