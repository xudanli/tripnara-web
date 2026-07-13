/**
 * 行程责任分配 API
 * GET/PATCH /trips/:tripId/responsibility-owners
 */

import apiClient from './client';
import { isApiNotReadyError } from '@/lib/api-fallback-mode';
import {
  mergeResponsibilityOwners,
  normalizeTripResponsibilityOwnersResponse,
} from '@/lib/trip-responsibility.util';
import type {
  PatchTripResponsibilityOwnersRequest,
  TripResponsibilityOwners,
  TripResponsibilityOwnersResponse,
} from '@/types/trip-responsibility';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: { message?: string };
}

type ApiWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiWrapper<T> }): T {
  if (!response?.data?.success) {
    throw new Error((response.data as ErrorResponse).error?.message ?? '请求失败');
  }
  return response.data.data;
}

const localOwnersCache = new Map<string, TripResponsibilityOwners>();

export const tripResponsibilityApi = {
  /**
   * GET /trips/:tripId/responsibility-owners — 登录（行程成员）
   * metadata 无 SSOT 时由 collaborators + pending invites + stakeholders 推导
   */
  get: async (tripId: string): Promise<TripResponsibilityOwnersResponse | null> => {
    try {
      const response = await apiClient.get<ApiWrapper<unknown>>(
        `/trips/${encodeURIComponent(tripId)}/responsibility-owners`,
      );
      return normalizeTripResponsibilityOwnersResponse(handleResponse(response), tripId);
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        const owners = localOwnersCache.get(tripId);
        return owners ? { tripId, owners } : null;
      }
      return null;
    }
  },

  /** PATCH /trips/:tripId/responsibility-owners — 登录（OWNER / ADVISOR / EDITOR） */
  patch: async (
    tripId: string,
    body: PatchTripResponsibilityOwnersRequest,
  ): Promise<TripResponsibilityOwnersResponse> => {
    try {
      const response = await apiClient.patch<ApiWrapper<unknown>>(
        `/trips/${encodeURIComponent(tripId)}/responsibility-owners`,
        body,
      );
      const normalized = normalizeTripResponsibilityOwnersResponse(handleResponse(response), tripId);
      localOwnersCache.set(tripId, normalized.owners);
      return normalized;
    } catch (error) {
      if (import.meta.env.DEV && isApiNotReadyError(error)) {
        const existing = localOwnersCache.get(tripId);
        if (!existing) {
          throw new Error('责任分配尚未初始化');
        }
        const merged = mergeResponsibilityOwners(existing, body.owners ?? {});
        localOwnersCache.set(tripId, merged);
        return { tripId, owners: merged };
      }
      throw error;
    }
  },

  /** DEV / 创建后立即写入本地缓存 */
  seedLocal: (tripId: string, owners: TripResponsibilityOwners) => {
    localOwnersCache.set(tripId, owners);
  },
};
