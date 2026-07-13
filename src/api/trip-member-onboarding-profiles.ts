/**
 * 顾问读取行程成员 Onboarding 画像
 * GET /trips/:tripId/member-onboarding-profiles
 *
 * BFF 未部署时（404）降级：从 GET /trips/:id 的 metadata.memberOnboardingProfiles 读取已提交画像
 */

import type { AxiosError } from 'axios';
import apiClient from './client';
import { normalizeMemberOnboardingProfilesResponse } from '@/lib/normalize-team-requirement-profile.util';
import type { MemberOnboardingProfilesResponse } from '@/types/team-requirement-profile';

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

function isNotFoundError(error: unknown): boolean {
  const err = error as AxiosError<{ statusCode?: number; message?: string | string[] }>;
  const status = err.response?.status ?? err.response?.data?.statusCode;
  return status === 404;
}

/** BFF 404 时从行程 metadata 拼装（无 pendingMembers / 隐私脱敏） */
async function loadFromTripMetadata(tripId: string): Promise<MemberOnboardingProfilesResponse> {
  const response = await apiClient.get<ApiWrapper<{ metadata?: Record<string, unknown> }>>(
    `/trips/${encodeURIComponent(tripId)}`,
  );
  const trip = handleResponse(response);
  const metadata = trip.metadata ?? {};
  const profilesRaw =
    metadata.memberOnboardingProfiles ?? metadata.member_onboarding_profiles;

  console.warn(
    '[member-onboarding-profiles] BFF 404，已从 trip.metadata 降级读取（无 pendingMembers）',
    { tripId },
  );

  return {
    ...normalizeMemberOnboardingProfilesResponse(
      {
        tripId,
        profiles: profilesRaw,
        pendingMembers: [],
        generatedAt: new Date().toISOString(),
      },
      tripId,
    ),
    source: 'trip_metadata',
  };
}

export const tripMemberOnboardingProfilesApi = {
  /** GET /trips/:tripId/member-onboarding-profiles — OWNER / ADVISOR / EDITOR */
  list: async (tripId: string): Promise<MemberOnboardingProfilesResponse> => {
    try {
      const response = await apiClient.get<ApiWrapper<unknown>>(
        `/trips/${encodeURIComponent(tripId)}/member-onboarding-profiles`,
      );
      const data = normalizeMemberOnboardingProfilesResponse(handleResponse(response), tripId);
      return { ...data, source: 'bff' };
    } catch (error) {
      if (isNotFoundError(error)) {
        return loadFromTripMetadata(tripId);
      }
      throw error;
    }
  },
};
