/**
 * 成员确认 inbox API
 * GET /trips/member-invites/:code/confirm-inbox — 登录（已 accept 该邀请）
 * GET /trips/:tripId/members/me/confirm-inbox — 登录（行程成员）
 *
 * 后端已过滤 confirmScope；无 DecisionProblemCollector 时返回空列表
 */

import apiClient from './client';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import { normalizeMemberConfirmInboxResponse } from '@/lib/normalize-member-confirm-inbox.util';
import type { MemberConfirmInboxResponse } from '@/types/trip-confirm-inbox';

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
    throw new Error((response.data as ErrorResponse).error?.message ?? '请求失败');
  }
  return response.data.data;
}

function emptyInbox(tripId?: string): MemberConfirmInboxResponse {
  return { tripId, items: [], pendingCount: 0 };
}

export const memberConfirmInboxApi = {
  getByInviteCode: async (code: string): Promise<MemberConfirmInboxResponse> => {
    try {
      const response = await apiClient.get<ApiWrapper<unknown>>(
        `/trips/member-invites/${encodeURIComponent(code)}/confirm-inbox`,
      );
      return normalizeMemberConfirmInboxResponse(handleResponse(response));
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return emptyInbox();
      }
      throw error;
    }
  },

  getByTripId: async (tripId: string): Promise<MemberConfirmInboxResponse> => {
    try {
      const response = await apiClient.get<ApiWrapper<unknown>>(
        `/trips/${encodeURIComponent(tripId)}/members/me/confirm-inbox`,
      );
      return normalizeMemberConfirmInboxResponse(handleResponse(response), tripId);
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        return emptyInbox(tripId);
      }
      throw error;
    }
  },
};
